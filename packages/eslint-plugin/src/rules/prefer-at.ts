import type { TSESTree } from '@typescript-eslint/utils';

import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import {
  isClosingParenToken,
  isOpeningBracketToken,
  isOpeningParenToken,
} from '@typescript-eslint/utils/ast-utils';

import {
  createRule,
  getConstrainedTypeAtLocation,
  getParserServices,
  isAssignee,
  isNodeEqual,
  isTypeArrayTypeOrUnionOfArrayTypes,
  nullThrows,
  NullThrowsReasons,
} from '../util';

export default createRule({
  name: 'prefer-at',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce using `.at()` to access the last element of an array',
      requiresTypeChecking: true,
    },
    hasSuggestions: true,
    messages: {
      preferAt: 'Use `.at(-{{ offset }})` instead of indexing with `.length`.',
      preferAtSuggestion: 'Replace with `.at(-{{ offset }})`.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const { sourceCode } = context;
    const services = getParserServices(context);
    const checker = services.program.getTypeChecker();

    function isParenthesized(node: TSESTree.Node): boolean {
      const before = sourceCode.getTokenBefore(node);
      const after = sourceCode.getTokenAfter(node);
      return (
        before != null &&
        after != null &&
        isOpeningParenToken(before) &&
        isClosingParenToken(after)
      );
    }

    return {
      'MemberExpression[computed=true][optional=false]'(
        node: TSESTree.MemberExpressionComputedName,
      ) {
        const { property } = node;
        if (
          property.type !== AST_NODE_TYPES.BinaryExpression ||
          property.operator !== '-' ||
          property.left.type !== AST_NODE_TYPES.MemberExpression ||
          property.left.computed ||
          property.left.property.type !== AST_NODE_TYPES.Identifier ||
          property.left.property.name !== 'length' ||
          property.right.type !== AST_NODE_TYPES.Literal ||
          typeof property.right.value !== 'number' ||
          !Number.isInteger(property.right.value) ||
          property.right.value < 1 ||
          !isNodeEqual(node.object, property.left.object) ||
          isAssignee(node) ||
          isCalledOrTagged(node) ||
          isParenthesized(property.left)
        ) {
          return;
        }

        const objectType = getConstrainedTypeAtLocation(services, node.object);
        if (
          !isTypeArrayTypeOrUnionOfArrayTypes(objectType, checker) ||
          !objectType.getProperty('at')
        ) {
          return;
        }

        const data = { offset: String(property.right.value) };
        const lengthTokens = sourceCode.getTokens(property.left);

        context.report({
          node,
          messageId: 'preferAt',
          data,
          suggest: [
            {
              messageId: 'preferAtSuggestion',
              data,
              *fix(fixer) {
                const openBracket = nullThrows(
                  sourceCode.getTokenAfter(node.object, isOpeningBracketToken),
                  NullThrowsReasons.MissingToken('[', 'member expression'),
                );
                const closeBracket = nullThrows(
                  sourceCode.getLastToken(node),
                  NullThrowsReasons.MissingToken(']', 'member expression'),
                );

                yield fixer.replaceText(openBracket, '.at(');
                for (const token of lengthTokens) {
                  yield fixer.remove(token);
                }
                yield fixer.replaceText(closeBracket, ')');
              },
            },
          ],
        });
      },
    };
  },
});

/**
 * `a[a.length - 1]()` calls with `this` bound to `a`, `a.at(-1)()` does not.
 */
function isCalledOrTagged(node: TSESTree.MemberExpression): boolean {
  const { parent } = node;
  switch (parent.type) {
    case AST_NODE_TYPES.CallExpression:
      return parent.callee === node;
    case AST_NODE_TYPES.TaggedTemplateExpression:
      return parent.tag === node;
    default:
      return false;
  }
}
