import { noFormat } from '@typescript-eslint/rule-tester';

import rule from '../../../src/rules/prefer-optional-chain';
import { createRuleTesterWithTypes } from '../../RuleTester';

const ruleTester = createRuleTesterWithTypes();

ruleTester.run('prefer-optional-chain-if-statement', rule, {
  assertionOptions: {
    requireData: true,
  },
  valid: [
    `
declare const callback: (() => void) | undefined;
declare const callbacks: (() => void)[];
if (callback) {
  callbacks.push(callback);
}
    `,
    `
declare const list: string[] | undefined;
if (list) {
  list.push('a');
} else {
  console.log('no list');
}
    `,
    `
declare const list: string[] | undefined;
if (list) {
  list.push('a');
  list.push('b');
}
    `,
    `
declare const list: string[] | undefined;
if (list) {
  const length = list.push('a');
}
    `,
    `
declare const list: string[] | undefined;
if (list) list?.push('a');
    `,
    `
declare const list: string[];
if (list) list.push('a');
    `,
    `
declare const text: string | undefined;
if (text) text.trim();
    `,
    `
declare const count: number | undefined;
if (count) count.toFixed();
    `,
    `
declare const obj: { list?: string[] };
if (obj.list) obj.list.length.toFixed();
    `,
  ],
  invalid: [
    {
      code: `
declare const callback: (() => void) | undefined;
if (callback) {
  callback();
}
      `,
      errors: [
        {
          column: 1,
          endColumn: 2,
          endLine: 5,
          line: 3,
          messageId: 'preferOptionalChain',
        },
      ],
      output: `
declare const callback: (() => void) | undefined;
callback?.();
      `,
    },
    {
      code: `
declare const list: string[] | undefined;
declare const item: string;
if (list) list.push(item);
      `,
      errors: [
        {
          column: 1,
          endColumn: 27,
          endLine: 4,
          line: 4,
          messageId: 'preferOptionalChain',
        },
      ],
      output: `
declare const list: string[] | undefined;
declare const item: string;
list?.push(item);
      `,
    },
    {
      code: `
declare const obj: { list?: string[] };
if (obj.list) {
  obj.list.push('a');
}
      `,
      errors: [
        {
          column: 1,
          endColumn: 2,
          endLine: 5,
          line: 3,
          messageId: 'preferOptionalChain',
        },
      ],
      output: `
declare const obj: { list?: string[] };
obj.list?.push('a');
      `,
    },
    {
      code: `
declare const handlers: Record<string, (() => void) | undefined>;
if (handlers['a']) handlers['a']();
      `,
      errors: [
        {
          column: 1,
          endColumn: 36,
          endLine: 3,
          line: 3,
          messageId: 'preferOptionalChain',
        },
      ],
      output: `
declare const handlers: Record<string, (() => void) | undefined>;
handlers['a']?.();
      `,
    },
    {
      code: noFormat`
declare const list: string[] | null;
if (list) list['push']('a');
      `,
      errors: [
        {
          column: 1,
          endColumn: 29,
          endLine: 3,
          line: 3,
          messageId: 'preferOptionalChain',
        },
      ],
      output: noFormat`
declare const list: string[] | null;
list?.['push']('a');
      `,
    },
    {
      code: `
declare const list: string[] | undefined;
if (list) {
  // add an item
  list.push('a');
}
      `,
      errors: [
        {
          column: 1,
          endColumn: 2,
          endLine: 6,
          line: 3,
          messageId: 'preferOptionalChain',
        },
      ],
      output: null,
    },
  ],
});
