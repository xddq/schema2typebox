import { describe, expect, it } from "@jest/globals";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

// Mirrors the structure schema2typebox emits for test/fixture/recursiveCondition.json:
// the recursive node is wrapped in Type.Recursive(...) and the back-edge oneOf
// is rendered as Type.Union (NOT the custom OneOf helper, which cannot
// dereference a bare 'This' ref).
const Leaf = Type.Object({
  type: Type.Literal("leaf"),
  value: Type.Number(),
});
const Condition = Type.Recursive((This) => {
  return Type.Union([
    Leaf,
    Type.Object({
      type: Type.Literal("and"),
      conditions: Type.Array(This),
    }),
  ]);
});

describe("recursive generated shape validates at runtime", () => {
  it("accepts a deeply nested condition tree", () => {
    const tree = {
      type: "and",
      conditions: [
        { type: "leaf", value: 1 },
        {
          type: "and",
          conditions: [
            { type: "leaf", value: 2 },
            { type: "leaf", value: 3 },
          ],
        },
      ],
    };
    expect(Value.Check(Condition, tree)).toBe(true);
  });

  it("rejects an 'and' node with no conditions array", () => {
    expect(Value.Check(Condition, { type: "and" })).toBe(false);
  });

  it("rejects a leaf with a non-numeric value", () => {
    expect(Value.Check(Condition, { type: "leaf", value: "x" })).toBe(false);
  });
});
