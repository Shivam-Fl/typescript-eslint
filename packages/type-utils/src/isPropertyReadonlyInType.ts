import type * as ts from 'typescript';

import * as tsutils from 'ts-api-utils';

/**
 * Matches `CheckFlags.Readonly` from the TypeScript checker (not public API).
 *
 * Verified against TypeScript 6.0.2, where it is read from
 * `symbol.links.checkFlags`. The direct `symbol.checkFlags` fallback is for
 * older versions and has not been verified against a specific release. If the
 * property is missing, only ts-api-utils' result applies.
 */
const CHECK_FLAGS_READONLY = 1 << 3;

/**
 * The checker stores `checkFlags` on transient symbols: directly on the symbol
 * in older TypeScript versions, and under `links` in newer ones.
 */
interface TransientSymbol extends ts.Symbol {
  checkFlags?: number;
  links?: { checkFlags?: number };
}

function hasReadonlyCheckFlag(symbol: ts.Symbol): boolean {
  const { checkFlags, links } = symbol as TransientSymbol;
  return ((links?.checkFlags ?? checkFlags ?? 0) & CHECK_FLAGS_READONLY) !== 0;
}

/**
 * Like ts-api-utils' `isPropertyReadonlyInType`, but also recognizes the
 * properties the checker marks as readonly itself, such as those of a spread
 * object asserted `as const` (`{ ...base } as const`).
 */
export function isPropertyReadonlyInType(
  type: ts.Type,
  name: ts.__String,
  checker: ts.TypeChecker,
): boolean {
  if (tsutils.isPropertyReadonlyInType(type, name, checker)) {
    return true;
  }

  const property = type.getProperty(name as string);
  return property != null && hasReadonlyCheckFlag(property);
}
