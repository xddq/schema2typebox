import { expect } from "chai";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { schema2typebox } from "../../src/index";

describe("integration tests - testing against real world schemas", () => {
  test("schema.org - dayOfWeek", async () => {
    const inputSchema = readFileSync(
      process.cwd() + "/test/integration/schemas/dayOfWeek.json",
      "utf-8"
    );
    const result = await schema2typebox({ input: inputSchema });
    const expectedResult = readFileSync(
      process.cwd() + "/test/integration/schemas/dayOfWeek.ts",
      "utf-8"
    );
    expect(result).to.equal(expectedResult);
  });
});
