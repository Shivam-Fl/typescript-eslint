import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';

import { isColonToken, isNullLiteral, isUndefinedIdentifier } from '../../util';

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

export { getComparedOperand, isNullOrUndefined, isQuestionToken };
