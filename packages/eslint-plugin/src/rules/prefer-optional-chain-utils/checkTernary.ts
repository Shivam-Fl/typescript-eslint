import type {
  ParserServicesWithTypeInformation,
  TSESTree,
} from '@typescript-eslint/utils';
import type {
  ReportFixFunction,
  RuleContext,
} from '@typescript-eslint/utils/ts-eslint';

import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';

import type {
  PreferOptionalChainMessageIds,
  PreferOptionalChainOptions,
} from './PreferOptionalChainOptions';

import { isColonToken, isNullLiteral, isUndefinedIdentifier } from '../../util';
import { checkNullishAndReport } from './checkNullishAndReport';
import { compareNodes, NodeComparisonResult } from './compareNodes';

function isQuestionToken(
  token: TSESTree.Token,
): token is TSESTree.PunctuatorToken {
  return token.type === AST_TOKEN_TYPES.Punctuator && token.value === '?';
}

function isUndefined(node: TSESTree.Node): boolean {
  return (
    isUndefinedIdentifier(node) ||
    (node.type === AST_NODE_TYPES.UnaryExpression &&
      node.operator === 'void' &&
      node.argument.type === AST_NODE_TYPES.Literal)
  );
}

function isNullOrUndefined(node: TSESTree.Node): boolean {
  return isNullLiteral(node) || isUndefined(node);
}

/**
 * Given `a OP b` where one side satisfies `isValue`, returns the other side.
 */
function getComparedOperand(
  node: TSESTree.Node,
  operator: '!=' | '!==' | '==' | '===',
  isValue: (node: TSESTree.Node) => boolean,
): TSESTree.Expression | undefined {
  if (
    node.type !== AST_NODE_TYPES.BinaryExpression ||
    node.operator !== operator
  ) {
    return undefined;
  }
  if (
    isValue(node.right) &&
    node.left.type !== AST_NODE_TYPES.PrivateIdentifier
  ) {
    return node.left;
  }
  return isValue(node.left) ? node.right : undefined;
}

/**
 * Matches `a === null || a === undefined` and `a !== null && a !== undefined`
 * (in either order), returning `a`.
 */
function getStrictlyComparedOperand(
  node: TSESTree.Node,
  logicalOperator: '&&' | '||',
  operator: '!==' | '===',
): TSESTree.Expression | undefined {
  if (
    node.type !== AST_NODE_TYPES.LogicalExpression ||
    node.operator !== logicalOperator
  ) {
    return undefined;
  }
  for (const [first, second] of [
    [node.left, node.right],
    [node.right, node.left],
  ]) {
    const nullOperand = getComparedOperand(first, operator, isNullLiteral);
    const undefinedOperand = getComparedOperand(second, operator, isUndefined);
    if (
      nullOperand &&
      undefinedOperand &&
      compareNodes(nullOperand, undefinedOperand) === NodeComparisonResult.Equal
    ) {
      return nullOperand;
    }
  }
  return undefined;
}

interface TernaryTest {
  /** The expression being checked for nullishness. */
  checked: TSESTree.Expression;
  /** Whether the test is true when `checked` is `null` or `undefined`. */
  isNullishTest: boolean;
}

function parseTest(test: TSESTree.Expression): TernaryTest | undefined {
  const nullish =
    getComparedOperand(test, '==', isNullOrUndefined) ??
    getStrictlyComparedOperand(test, '||', '===');
  if (nullish) {
    return { checked: nullish, isNullishTest: true };
  }
  const nonNullish =
    getComparedOperand(test, '!=', isNullOrUndefined) ??
    getStrictlyComparedOperand(test, '&&', '!==');
  if (nonNullish) {
    return { checked: nonNullish, isNullishTest: false };
  }
  return undefined;
}

/**
 * Finds the node in the member/call chain that is the checked expression.
 */
function findCheckedNodeInChain(
  chain: TSESTree.Expression,
  checked: TSESTree.Expression,
): TSESTree.Node | undefined {
  if (chain.type === AST_NODE_TYPES.ChainExpression) {
    return findCheckedNodeInChain(chain.expression, checked);
  }

  let current: TSESTree.Node = chain;
  while (
    current.type === AST_NODE_TYPES.MemberExpression ||
    current.type === AST_NODE_TYPES.CallExpression
  ) {
    const next: TSESTree.Node =
      current.type === AST_NODE_TYPES.MemberExpression
        ? current.object
        : current.callee;
    if (compareNodes(checked, next) === NodeComparisonResult.Equal) {
      return next;
    }
    current = next;
  }
  return undefined;
}

/**
 * Reports `foo == null ? undefined : foo.bar` and
 * `foo != null ? foo.bar : undefined`, which are `foo?.bar`.
 */
export function checkTernary(
  context: RuleContext<
    PreferOptionalChainMessageIds,
    [PreferOptionalChainOptions]
  >,
  parserServices: ParserServicesWithTypeInformation,
  options: PreferOptionalChainOptions,
  node: TSESTree.ConditionalExpression,
): void {
  const parsedTest = parseTest(node.test);
  if (!parsedTest) {
    return;
  }

  const { checked, isNullishTest } = parsedTest;
  const [undefinedBranch, chain] = isNullishTest
    ? [node.consequent, node.alternate]
    : [node.alternate, node.consequent];
  if (!isUndefined(undefinedBranch)) {
    return;
  }

  const checkedInChain = findCheckedNodeInChain(chain, checked);
  if (!checkedInChain) {
    return;
  }

  const { sourceCode } = context;

  checkNullishAndReport(context, parserServices, options, [checked], {
    node,
    messageId: 'preferOptionalChain',
  });
}
