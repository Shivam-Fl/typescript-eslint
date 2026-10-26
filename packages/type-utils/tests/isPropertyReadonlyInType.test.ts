import type { TSESTree } from '@typescript-eslint/typescript-estree';

import * as ts from 'typescript';

import { isPropertyReadonlyInType } from '../src/index.js';
import { parseCodeForEslint } from './test-utils/custom-matchers/custom-matchers.js';

describe(isPropertyReadonlyInType, () => {
  function getTypeAndChecker(code: string): {
    checker: ts.TypeChecker;
    type: ts.Type;
  } {
    const { ast, services } = parseCodeForEslint(code);
    const declaration = ast.body.at(-1) as TSESTree.TSTypeAliasDeclaration;

    return {
      checker: services.program.getTypeChecker(),
      type: services.getTypeAtLocation(declaration.id),
    };
  }

  describe('properties the checker flags as readonly', () => {
    const code = `
      declare const base: { a: string };
      const spread = { ...base } as const;
      type Test = typeof spread;
    `;

    it('is true for a property of a spread object asserted as const', () => {
      const { checker, type } = getTypeAndChecker(code);

      expect(
        isPropertyReadonlyInType(
          type,
          ts.escapeLeadingUnderscores('a'),
          checker,
        ),
      ).toBe(true);
    });
  });

  it.for([
    ['type Test = { readonly a: string };', 'a', true],
    ['type Test = { a: string };', 'a', false],
    ['declare const base: { a: string }; type Test = typeof base;', 'a', false],
    ['type Test = { readonly a: string; b: string };', 'b', false],
    ['type Test = { readonly a: string };', 'missing', false],
  ] as const)(
    'when code is %s and property is %s, returns %s',
    ([code, name, expected], { expect }) => {
      const { checker, type } = getTypeAndChecker(code);

      expect(
        isPropertyReadonlyInType(
          type,
          ts.escapeLeadingUnderscores(name),
          checker,
        ),
      ).toBe(expected);
    },
  );
});
