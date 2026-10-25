import { analyze } from '../src';
import { parse } from './test-utils';

describe('analyze()', () => {
  it('should throw error when passed a partial AST node', () => {
    const ast = parse(`const hello: string = 'world';`, {
      range: true,
    });
    const partialNode = ast.body[0];

    expect(() => {
      // @ts-expect-error -- to reproduce https://github.com/typescript-eslint/typescript-eslint/issues/11727
      analyze(partialNode);
    }).toThrow();
  });

  it.each(['+', '||'])(
    'should not overflow the stack for a long chain of %s operators',
    operator => {
      const operandCount = 10_000;
      const operands = Array.from({ length: operandCount }, () => 'x');
      const ast = parse(`let x; ${operands.join(` ${operator} `)};`, {
        range: true,
      });

      const scopeManager = analyze(ast);

      const variable = scopeManager.globalScope?.set.get('x');
      expect(variable?.references).toHaveLength(operandCount);
    },
  );
});
