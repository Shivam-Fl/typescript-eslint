import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, AST_TOKEN_TYPES } from '@typescript-eslint/utils';

import { isNullLiteral, isUndefinedIdentifier } from '../../util';

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

export { isNullOrUndefined, isQuestionToken };
