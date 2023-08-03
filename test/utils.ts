
import path from "node:path";
import * as prettier from "prettier";
import assert from "node:assert/strict";

export const SHELLJS_RETURN_CODE_OK = 0;

export const buildOsIndependentPath = (foldersOrFiles: string[]) => {
  return foldersOrFiles.join(path.sep);
};

export const formatWithPrettier = (input: string): string => {
  return prettier.format(input, { parser: "typescript" });
};

/**
 * Formats given input with prettier and returns the result. This is used for
 * testing to be able to compare generated types with expected types without
 * having to take care of formatting.
 * @throws Error
 **/
export const expectEqualIgnoreFormatting = (
    input1: string,
    input2: string
  ): void => {
    assert.equal(formatWithPrettier(input1), formatWithPrettier(input2));
  };