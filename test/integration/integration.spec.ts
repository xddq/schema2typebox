import { expect } from "chai";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { buildOsIndependentPath } from "test/test-utils";
import { schema2typebox } from "../../src/index";

describe("integration tests - testing against real world schemas", () => {
  test("schema.org - dayOfWeek", async () => {
    const inputSchema = readFileSync(
      buildOsIndependentPath([
        process.cwd(),
        ..."test/integration/schemas/dayOfWeek.json".split("/"),
      ]),
      "utf-8"
    );
    const result = await schema2typebox({ input: inputSchema });
    const expectedResult = readFileSync(
      buildOsIndependentPath([
        process.cwd(),
        ..."test/integration/schemas/dayOfWeek.ts".split("/"),
      ]),
      "utf-8"
    );
    expect(result).to.equal(expectedResult);
  });
});
