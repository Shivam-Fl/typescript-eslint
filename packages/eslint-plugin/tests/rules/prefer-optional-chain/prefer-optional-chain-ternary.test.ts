import rule from '../../../src/rules/prefer-optional-chain';
import { createRuleTesterWithTypes } from '../../RuleTester';

const ruleTester = createRuleTesterWithTypes();

ruleTester.run('prefer-optional-chain-ternary', rule, {
  assertionOptions: {
    requireData: true,
  },
  valid: [
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo === null ? undefined : foo.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo !== null ? foo.bar : undefined;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo === undefined ? undefined : foo.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? null : foo.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null ? foo.bar : null;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? foo.bar : undefined;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null ? undefined : foo.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
declare const bar: { baz: number };
foo == null ? undefined : bar.baz;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
declare function bar(value: unknown): number;
foo == null ? undefined : bar(foo);
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? undefined : foo;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? undefined : foo.bar + 1;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
declare const bar: unknown;
foo == bar ? undefined : foo.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo === null || foo === null ? undefined : foo.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo !== null && foo !== null ? foo.bar : undefined;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
declare const bar: unknown;
foo === null || bar === undefined ? undefined : foo.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo ? foo.bar : undefined;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? undefined : [foo].length;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number };
foo == null ? undefined : foo.bar;
      `,
      options: [{ requireNullish: true }],
    },
  ],
  invalid: [
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null ? foo?.bar : undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar<T>(): T } | null | undefined;
foo == null ? undefined : foo.bar<number>();
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar<T>(): T } | null | undefined;
foo?.bar<number>();
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
(foo) == null ? undefined : (foo).bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
    {
      code: `
declare const foo: { bar: number } | null;
foo == null ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      options: [{ requireNullish: true }],
      output: `
declare const foo: { bar: number } | null;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == undefined ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
null == foo ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? void 0 : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null ? foo.bar : undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != undefined ? foo.bar : undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null ? foo.bar : void 0;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo === null || foo === undefined ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo === undefined || foo === null ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo !== null && foo !== undefined ? foo.bar : undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo !== undefined && foo !== null ? foo.bar : undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? undefined : foo['bar'];
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo?.['bar'];
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? undefined : foo /* comment */ .bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: number } | null | undefined;
foo /* comment */ ?.bar;
      `,
    },
    {
      code: `
declare const foo: { bar: { baz: number } | null | undefined } | null | undefined;
foo == null ? undefined : foo.bar?.baz;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: { baz: number } | null | undefined } | null | undefined;
foo?.bar?.baz;
      `,
    },
    {
      code: `
declare const foo: { bar(): number } | null | undefined;
foo == null ? undefined : foo.bar();
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar(): number } | null | undefined;
foo?.bar();
      `,
    },
    {
      code: `
declare const foo: { bar: { baz: number } } | null | undefined;
foo == null ? undefined : foo.bar.baz;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar: { baz: number } } | null | undefined;
foo?.bar.baz;
      `,
    },
    {
      code: `
declare const foo: { bar?: () => number };
foo.bar == null ? undefined : foo.bar();
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: `
declare const foo: { bar?: () => number };
foo.bar?.();
      `,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo /* comment */ == null ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null /* comment */ ? undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? /* comment */ undefined : foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo == null ? undefined : /* comment */ foo.bar;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null /* comment */ ? foo.bar : undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null ? foo.bar /* comment */ : undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
    {
      code: `
declare const foo: { bar: number } | null | undefined;
foo != null ? foo.bar : /* comment */ undefined;
      `,
      errors: [{ messageId: 'preferOptionalChain', suggestions: null }],
      output: null,
    },
  ],
});
