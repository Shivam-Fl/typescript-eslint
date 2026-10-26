import type { VisitorKeys } from '@typescript-eslint/visitor-keys';

import { visitorKeys } from '@typescript-eslint/visitor-keys';

import type { TSESTree } from './ts-estree';

function isValidNode(x: unknown): x is TSESTree.Node {
  return (
    typeof x === 'object' &&
    x != null &&
    'type' in x &&
    typeof x.type === 'string'
  );
}

function getVisitorKeysForNode(
  allVisitorKeys: typeof visitorKeys,
  node: TSESTree.Node,
): readonly (keyof TSESTree.Node)[] {
  const keys = allVisitorKeys[node.type];
  return (keys ?? []) as never;
}

type SimpleTraverseOptions = Readonly<
  | {
      enter: (node: TSESTree.Node, parent: TSESTree.Node | undefined) => void;
      visitorKeys?: Readonly<VisitorKeys>;
    }
  | {
      visitorKeys?: Readonly<VisitorKeys>;
      visitors: Record<
        string,
        (node: TSESTree.Node, parent: TSESTree.Node | undefined) => void
      >;
    }
>;

class SimpleTraverser {
  private readonly allVisitorKeys: Readonly<VisitorKeys> = visitorKeys;
  private readonly selectors: SimpleTraverseOptions;
  private readonly setParentPointers: boolean;

  constructor(selectors: SimpleTraverseOptions, setParentPointers = false) {
    this.selectors = selectors;
    this.setParentPointers = setParentPointers;
    if (selectors.visitorKeys) {
      this.allVisitorKeys = selectors.visitorKeys;
    }
  }

  traverse(
    startingNode: unknown,
    startingParent: TSESTree.Node | undefined,
  ): void {
    // Iterative (not recursive) so that deeply nested trees, such as a long
    // chain of binary operators, cannot overflow the call stack.
    const pending: [unknown, TSESTree.Node | undefined][] = [
      [startingNode, startingParent],
    ];

    for (let item = pending.pop(); item; item = pending.pop()) {
      const [node, parent] = item;
      if (!isValidNode(node)) {
        continue;
      }

      if (this.setParentPointers) {
        node.parent = parent;
      }

      if ('enter' in this.selectors) {
        this.selectors.enter(node, parent);
      } else if (node.type in this.selectors.visitors) {
        this.selectors.visitors[node.type](node, parent);
      }

      const keys = getVisitorKeysForNode(this.allVisitorKeys, node);

      // children are pushed in reverse so they are visited in key order
      // (they are read once, right after the node itself is entered)
      for (let i = keys.length - 1; i >= 0; i--) {
        const childOrChildren = node[keys[i]];

        if (Array.isArray(childOrChildren)) {
          for (let j = childOrChildren.length - 1; j >= 0; j--) {
            pending.push([childOrChildren[j], node]);
          }
        } else {
          pending.push([childOrChildren, node]);
        }
      }
    }
  }
}

export function simpleTraverse(
  startingNode: TSESTree.Node,
  options: SimpleTraverseOptions,
  setParentPointers = false,
): void {
  new SimpleTraverser(options, setParentPointers).traverse(
    startingNode,
    undefined,
  );
}
