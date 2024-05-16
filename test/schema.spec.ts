import { describe, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { schema2typebox } from "../src/index";
import { buildOsIndependentPath, expectEqualIgnoreFormatting } from "./util";

describe("when testing against real world schemas", () => {
  test("works for schema.org - dayOfWeek", async () => {
    const inputSchema = readFileSync(
      buildOsIndependentPath([
        process.cwd(),
        ..."test/fixture/dayOfWeek.json".split("/"),
      ]),
      "utf-8"
    );
    const result = await schema2typebox({ input: inputSchema });
    const expectedResult = readFileSync(
      buildOsIndependentPath([
        process.cwd(),
        ..."test/fixture/dayOfWeek.ts".split("/"),
      ]),
      "utf-8"
    );
    await expectEqualIgnoreFormatting(result, expectedResult);
  });
});
