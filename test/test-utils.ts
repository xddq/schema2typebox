import assert from "node:assert/strict";
import * as prettier from "prettier";

const formatWithPrettier = async (input: string): Promise<string> => {
  return await prettier.format(input, { parser: "typescript" });
};

/**
 * Formats given input with prettier and returns the result. This is used for
 * testing to be able to compare generated types with expected types without
 * having to take care of formatting.
 *
 * @throws Error
 **/
export const expectEqualIgnoreFormatting = async (
  input1: string,
  input2: string
): Promise<void> => {
  assert.equal(
    await formatWithPrettier(input1),
    await formatWithPrettier(input2)
  );
};
