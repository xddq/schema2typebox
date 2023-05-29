// Replace this with the 'import { schema2typebox, Schema2TypeboxOptions } from
// "schema2typebox"' when you install the package.
import { readFileSync, writeFileSync } from "node:fs";
import { schema2typebox } from "../../src/index";

(async () => {
  const file = readFileSync(__dirname + "/schema.json", "utf-8");
  const result = await schema2typebox({ input: file });
  writeFileSync(__dirname + "/generated-typebox.ts", result);
})();
