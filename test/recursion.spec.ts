import { describe, expect, it } from "@jest/globals";
import { JSONSchema7 } from "json-schema";
import { findRecursionTargets } from "../src/recursion";

describe("findRecursionTargets()", () => {
  it("returns an empty map for a non-recursive schema", () => {
    const schema: JSONSchema7 = {
      type: "object",
      properties: { a: { type: "string" } },
    };
    expect(findRecursionTargets(schema).size).toBe(0);
  });

  it("does not treat a shared non-recursive reference as recursion", () => {
    // The same leaf object is reachable from two sibling branches. Because the
    // DFS path is popped between branches, this is NOT a cycle.
    const leaf = { type: "string" } as JSONSchema7;
    const schema = {
      type: "object",
      properties: { a: leaf, b: leaf },
    } as JSONSchema7;
    expect(findRecursionTargets(schema).size).toBe(0);
  });

  it("detects a self-referential node and assigns the 'This' placeholder", () => {
    const node = { type: "object", properties: {} } as Record<string, unknown>;
    (node.properties as Record<string, unknown>).self = node; // circular
    const targets = findRecursionTargets(node as JSONSchema7);
    expect(targets.get(node as object)).toBe("This");
    expect(targets.size).toBe(1);
  });

  it("marks the node pointed back to (not the root) for nested recursion", () => {
    // root -> oneOf -> andNode -> conditions(array) -> items === andNode
    const andNode = { type: "object", properties: {} } as Record<
      string,
      unknown
    >;
    (andNode.properties as Record<string, unknown>).conditions = {
      type: "array",
      items: andNode,
    };
    const root = {
      oneOf: [{ type: "number" }, andNode],
    } as unknown as JSONSchema7;
    const targets = findRecursionTargets(root);
    expect(targets.has(andNode as object)).toBe(true);
    expect(targets.has(root as object)).toBe(false);
    expect(targets.get(andNode as object)).toBe("This");
  });
});
