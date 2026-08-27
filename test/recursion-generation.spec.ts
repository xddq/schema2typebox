import { beforeAll, describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import { schema2typebox } from "../src/index";
import { buildOsIndependentPath } from "./util";

const readFixture = (relPath: string): string => {
  return readFileSync(
    buildOsIndependentPath([process.cwd(), ...relPath.split("/")]),
    "utf-8"
  );
};

describe("recursive schema support (issue #62)", () => {
  const input = readFixture("test/fixture/recursiveCondition.json");
  let result: string;

  // Generating from a recursive (circular) schema at all is the regression
  // guard for the original crash/hang; if it threw or looped, beforeAll would
  // fail and every test below would error.
  beforeAll(async () => {
    result = await schema2typebox({ input });
  });

  it("renders the recursive branch as Type.Recursive wrapping a native Type.Union", () => {
    // The self-referential node becomes Type.Recursive, and the oneOf that holds
    // the recursive back-edge must use native Type.Union rather than the custom
    // OneOf helper, which cannot dereference a bare recursive ref at validation
    // time.
    expect(result).toContain("Type.Recursive(");
    expect(result).toContain("Type.Union(");
  });

  it("keeps the custom OneOf helper for the non-recursive oneOf", () => {
    // The top-level oneOf has no free back-edge, so its exactly-one semantics are
    // preserved via the ExtendedOneOf helper instead of being switched to Union.
    expect(result).toContain("ExtendedOneOf");
  });
});
