import { JSONSchema7Definition } from "json-schema";

/**
 * Maps each recursion-target object (a schema node that is referenced again
 * while still on the current DFS path) to the TypeBox `Type.Recursive`
 * placeholder variable name we will emit for it ("This", "This1", ...).
 */
export type RecursionTargets = Map<object, string>;

const isTraversable = (value: unknown): value is object => {
  return typeof value === "object" && value !== null;
};

/**
 * Walks the (already dereferenced, possibly circular) schema graph and detects
 * recursion targets using depth-first search with cycle detection.
 *
 * - A node found again while still on the current DFS path (a back-edge) is a
 *   recursion target.
 * - Shared but non-recursive references (the same object reachable from sibling
 *   branches) are NOT targets, because the path set is popped when a branch
 *   completes.
 * - A "done" set prevents re-exploring fully-processed subtrees, keeping the
 *   walk linear in the number of nodes/edges.
 *
 * Arrays are traversed too (Object.values on an array yields its elements), so
 * cycles that close through an array (e.g. a oneOf list) are detected.
 */
export const findRecursionTargets = (
  root: JSONSchema7Definition
): RecursionTargets => {
  const targets: RecursionTargets = new Map();
  const onPath = new Set<object>();
  const done = new Set<object>();
  let counter = 0;

  const visit = (node: unknown): void => {
    if (!isTraversable(node)) {
      return;
    }
    if (onPath.has(node)) {
      if (!targets.has(node)) {
        targets.set(node, counter === 0 ? "This" : `This${counter}`);
        counter += 1;
      }
      return;
    }
    if (done.has(node)) {
      return;
    }
    onPath.add(node);
    for (const value of Object.values(node)) {
      visit(value);
    }
    onPath.delete(node);
    done.add(node);
  };

  visit(root);
  return targets;
};
