import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleFix } from '@typescript-eslint/utils/ts-eslint';

import { isTypeFlagSet } from '@typescript-eslint/type-utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import { unionConstituents } from 'ts-api-utils';
import * as ts from 'typescript';

import type { ValidOperand } from './prefer-optional-chain-utils/gatherLogicalOperands';
import type {
  PreferOptionalChainMessageIds,
  PreferOptionalChainOptions,
} from './prefer-optional-chain-utils/PreferOptionalChainOptions';

import {
  createRule,
  getOperatorPrecedence,
  getParserServices,
  OperatorPrecedence,
} from '../util';
import { analyzeChain } from './prefer-optional-chain-utils/analyzeChain';
import { checkNullishAndReport } from './prefer-optional-chain-utils/checkNullishAndReport';
import {
  compareNodes,
  NodeComparisonResult,
} from './prefer-optional-chain-utils/compareNodes';
import {
  gatherLogicalOperands,
  OperandValidity,
} from './prefer-optional-chain-utils/gatherLogicalOperands';

export default createRule<
  [PreferOptionalChainOptions],
  PreferOptionalChainMessageIds
>({
  name: 'prefer-optional-chain',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce using concise optional chain expressions instead of chained logical ands, negated logical ors, or empty objects',
      recommended: 'stylistic',
      requiresTypeChecking: true,
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      optionalChainSuggest: 'Change to an optional chain.',
      preferOptionalChain:
        "Prefer using an optional chain expression instead, as it's more concise and easier to read.",
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing: {
            type: 'boolean',
            description:
              'Allow autofixers that will change the return type of the expression. This option is considered unsafe as it may break the build.',
          },
          checkAny: {
            type: 'boolean',
            description:
              'Check operands that are typed as `any` when inspecting "loose boolean" operands.',
          },
          checkBigInt: {
            type: 'boolean',
            description:
              'Check operands that are typed as `bigint` when inspecting "loose boolean" operands.',
          },
          checkBoolean: {
            type: 'boolean',
            description:
              'Check operands that are typed as `boolean` when inspecting "loose boolean" operands.',
          },
          checkNumber: {
            type: 'boolean',
            description:
              'Check operands that are typed as `number` when inspecting "loose boolean" operands.',
          },
          checkString: {
            type: 'boolean',
            description:
              'Check operands that are typed as `string` when inspecting "loose boolean" operands.',
          },
          checkUnknown: {
            type: 'boolean',
            description:
              'Check operands that are typed as `unknown` when inspecting "loose boolean" operands.',
          },
          requireNullish: {
            type: 'boolean',
            description:
              'Skip operands that are not typed with `null` and/or `undefined` when inspecting "loose boolean" operands.',
          },
        },
      },
    ],
  },
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- For compatibility with ESLint 8, see #12842
  defaultOptions: [
    {
      allowPotentiallyUnsafeFixesThatModifyTheReturnTypeIKnowWhatImDoing: false,
      checkAny: true,
      checkBigInt: true,
      checkBoolean: true,
      checkNumber: true,
      checkString: true,
      checkUnknown: true,
      requireNullish: false,
    },
  ],
  create(context, [options]) {
    const parserServices = getParserServices(context);

    const seenLogicals = new Set<TSESTree.LogicalExpression>();

    function isNullishOrObjectType(node: TSESTree.Expression): boolean {
      const constituents = unionConstituents(
        parserServices.getTypeAtLocation(node),
      );
      return (
        constituents.some(t =>
          isTypeFlagSet(t, ts.TypeFlags.Null | ts.TypeFlags.Undefined),
        ) &&
        constituents.every(t =>
          isTypeFlagSet(
            t,
            ts.TypeFlags.Null |
              ts.TypeFlags.Undefined |
              ts.TypeFlags.Object |
              ts.TypeFlags.NonPrimitive,
          ),
        )
      );
    }

    return {
      // `if (foo) foo.bar();` / `if (foo) { foo(); }`
      IfStatement(node: TSESTree.IfStatement): void {
        const { test } = node;
        if (
          node.alternate ||
          (test.type !== AST_NODE_TYPES.Identifier &&
            (test.type !== AST_NODE_TYPES.MemberExpression || test.optional))
        ) {
          return;
        }

        const statement =
          node.consequent.type === AST_NODE_TYPES.BlockStatement &&
          node.consequent.body.length === 1
            ? node.consequent.body[0]
            : node.consequent;
        if (
          statement.type !== AST_NODE_TYPES.ExpressionStatement ||
          statement.expression.type !== AST_NODE_TYPES.CallExpression ||
          statement.expression.optional
        ) {
          return;
        }

        const { callee } = statement.expression;
        const guarded =
          callee.type === AST_NODE_TYPES.MemberExpression && !callee.optional
            ? callee.object
            : callee;
        if (compareNodes(test, guarded) !== NodeComparisonResult.Equal) {
          return;
        }

        if (!isNullishOrObjectType(test)) {
          return;
        }

        const { sourceCode } = context;
        const hasCommentsToKeep = sourceCode
          .getCommentsInside(node)
          .some(
            comment =>
              comment.range[0] < statement.range[0] ||
              comment.range[1] > statement.range[1],
          );
        // the comments inside the statement are kept by the fix
        // a parenthesized guard has no safe place to insert `?.`
        const separator = sourceCode.getTokenAfter(guarded);
        context.report({
          node,
          messageId: 'preferOptionalChain',
          fix:
            hasCommentsToKeep || !separator || separator.value === ')'
              ? null
              : (fixer): RuleFix => {
                  const isDot = separator.value === '.';
                  const statementText = sourceCode.text.slice(
                    statement.range[0],
                    statement.range[1],
                  );
                  const offset = separator.range[0] - statement.range[0];
                  return fixer.replaceText(
                    node,
                    `${statementText.slice(0, offset)}?.${statementText.slice(
                      offset + (isDot ? 1 : 0),
                    )}`,
                  );
                },
        });
      },

      'LogicalExpression[operator!="??"]'(
        node: TSESTree.LogicalExpression,
      ): void {
        if (seenLogicals.has(node)) {
          return;
        }

        const { newlySeenLogicals, operands } = gatherLogicalOperands(
          node,
          parserServices,
          context.sourceCode,
          options,
        );
        for (const logical of newlySeenLogicals) {
          seenLogicals.add(logical);
        }

        let currentChain: ValidOperand[] = [];
        for (const operand of operands) {
          if (operand.type === OperandValidity.Invalid) {
            analyzeChain(
              context,
              parserServices,
              options,
              node,
              node.operator,
              currentChain,
            );
            currentChain = [];
          } else if (operand.type === OperandValidity.Last) {
            analyzeChain(
              context,
              parserServices,
              options,
              node,
              node.operator,
              currentChain,
              operand,
            );
            currentChain = [];
          } else {
            currentChain.push(operand);
          }
        }

        // make sure to check whatever's left
        if (currentChain.length > 0) {
          analyzeChain(
            context,
            parserServices,
            options,
            node,
            node.operator,
            currentChain,
          );
        }
      },

      // specific handling for `(foo ?? {}).bar` / `(foo || {}).bar`
      'LogicalExpression[operator="||"], LogicalExpression[operator="??"]'(
        node: TSESTree.LogicalExpression,
      ): void {
        const leftNode = node.left;
        const rightNode = node.right;
        const parentNode = node.parent;
        const isRightNodeAnEmptyObjectLiteral =
          rightNode.type === AST_NODE_TYPES.ObjectExpression &&
          rightNode.properties.length === 0;
        if (
          !isRightNodeAnEmptyObjectLiteral ||
          parentNode.type !== AST_NODE_TYPES.MemberExpression ||
          parentNode.optional
        ) {
          return;
        }

        seenLogicals.add(node);

        function isLeftSideLowerPrecedence(): boolean {
          const logicalTsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
          const leftTsNode = parserServices.esTreeNodeToTSNodeMap.get(leftNode);
          const leftPrecedence = getOperatorPrecedence(
            leftTsNode.kind,
            logicalTsNode.operatorToken.kind,
          );

          return leftPrecedence < OperatorPrecedence.LeftHandSide;
        }

        checkNullishAndReport(context, parserServices, options, [leftNode], {
          node: parentNode,
          messageId: 'preferOptionalChain',
          suggest: [
            {
              messageId: 'optionalChainSuggest',
              fix: (fixer): RuleFix => {
                const leftNodeText = context.sourceCode.getText(leftNode);
                // Any node that is made of an operator with higher or equal precedence,
                const maybeWrappedLeftNode = isLeftSideLowerPrecedence()
                  ? `(${leftNodeText})`
                  : leftNodeText;
                const propertyToBeOptionalText = context.sourceCode.getText(
                  parentNode.property,
                );
                const maybeWrappedProperty = parentNode.computed
                  ? `[${propertyToBeOptionalText}]`
                  : propertyToBeOptionalText;
                return fixer.replaceTextRange(
                  parentNode.range,
                  `${maybeWrappedLeftNode}?.${maybeWrappedProperty}`,
                );
              },
            },
          ],
        });
      },
    };
  },
});
