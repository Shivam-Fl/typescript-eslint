import rule from '../../src/rules/prefer-at';
import { createRuleTesterWithTypes } from '../RuleTester';

const ruleTester = createRuleTesterWithTypes();

ruleTester.run('prefer-at', rule, {
  valid: [
    `
declare const array: string[];
array.at(-1);
    `,
    `
declare const array: string[];
array[0];
    `,
    `
declare const array: string[];
array[array.length];
    `,
    `
declare const array: string[];
array[array.length + 1];
    `,
    `
declare const array: string[];
array[array.length - 0];
    `,
    `
declare const array: string[];
array[array.length - 1.5];
    `,
    `
declare const array: string[];
declare const index: number;
array[array.length - index];
    `,
    `
declare const array: string[];
declare const other: string[];
array[other.length - 1];
    `,
    `
declare const array: string[];
const getArray = () => array;
getArray()[getArray().length - 1];
    `,
    `
declare const string: string;
string[string.length - 1];
    `,
    `
declare const record: Record<number, string> & { length: number };
record[record.length - 1];
    `,
    `
declare const array: string[];
array?.[array.length - 1];
    `,
    `
declare const array: string[];
array[array['length'] - 1];
    `,
    `
declare const array: string[];
array[array.length - 1] = 'value';
    `,
    `
declare const array: number[];
array[array.length - 1]++;
    `,
    `
declare const array: string[];
delete array[array.length - 1];
    `,
    `
declare const array: (() => void)[];
array[array.length - 1]();
    `,
    `
declare const object: { a: { b: string[] } };
object.a.b[object.a.length - 1];
    `,
  ],
  invalid: [
    {
      code: `
declare const array: string[];
array[array.length - 1];
      `,
      errors: [
        {
          data: { offset: '1' },
          messageId: 'preferAt',
          suggestions: [
            {
              data: { offset: '1' },
              messageId: 'preferAtSuggestion',
              output: `
declare const array: string[];
array.at(- 1);
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
declare const array: readonly string[];
array[array.length - 2];
      `,
      errors: [
        {
          data: { offset: '2' },
          messageId: 'preferAt',
          suggestions: [
            {
              data: { offset: '2' },
              messageId: 'preferAtSuggestion',
              output: `
declare const array: readonly string[];
array.at(- 2);
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
declare const array: string[] | number[];
array[array.length - 1];
      `,
      errors: [
        {
          data: { offset: '1' },
          messageId: 'preferAt',
          suggestions: [
            {
              data: { offset: '1' },
              messageId: 'preferAtSuggestion',
              output: `
declare const array: string[] | number[];
array.at(- 1);
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
declare const object: { items: string[] };
object.items[object.items.length - 1];
      `,
      errors: [
        {
          data: { offset: '1' },
          messageId: 'preferAt',
          suggestions: [
            {
              data: { offset: '1' },
              messageId: 'preferAtSuggestion',
              output: `
declare const object: { items: string[] };
object.items.at(- 1);
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
declare const array: string[];
const last = array[array.length - 1];
      `,
      errors: [
        {
          data: { offset: '1' },
          messageId: 'preferAt',
          suggestions: [
            {
              data: { offset: '1' },
              messageId: 'preferAtSuggestion',
              output: `
declare const array: string[];
const last = array.at(- 1);
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
declare const array: string[];
(array)[array.length - 1];
      `,
      errors: [
        {
          data: { offset: '1' },
          messageId: 'preferAt',
          suggestions: [
            {
              data: { offset: '1' },
              messageId: 'preferAtSuggestion',
              output: `
declare const array: string[];
(array).at(- 1);
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
declare const array: string[];
array /* a */ [ /* b */ array /* c */ . /* d */ length /* e */ - /* f */ 1 /* g */ ] /* h */;
      `,
      errors: [
        {
          data: { offset: '1' },
          messageId: 'preferAt',
          suggestions: [
            {
              data: { offset: '1' },
              messageId: 'preferAtSuggestion',
              output: `
declare const array: string[];
array /* a */ .at( /* b */  /* c */  /* d */  /* e */ - /* f */ 1 /* g */ ) /* h */;
      `,
            },
          ],
        },
      ],
    },
  ],
});
