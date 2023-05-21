import { describe, test } from "node:test";
import assert from "node:assert/strict";
import * as prettier from "prettier";
import {
  schema2Typebox as Schema2Typebox,
  collect,
} from "../src/schema-to-typebox";

const formatWithPrettier = (input: string): string => {
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

describe("schema2typebox", () => {
  test("object with required string property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      },
      "required": [
        "name"
      ]
    }`;
    const expectedTypebox = `
    import { Type, Static } from "@sinclair/typebox";

    type T = Static<typeof T>;
    const T = Type.Object({
      name: Type.String(),
    });
    `;
    expectEqualIgnoreFormatting(Schema2Typebox(dummySchema), expectedTypebox);
  });
  // TODO: probably rather test the collect() function than the schema2typebox
  // one?
});
describe("schema2typebox - collect()", () => {
  // NOTE: I currently think it is best to test the collect() function
  // directly(less overhead) instead of schema2typebox for now.
  test("object with required string property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      },
      "required": [
        "name"
      ]
    }`;
    const expectedTypebox = `
    Type.Object({
      name: Type.String(),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with optional string property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      }
    }
    `;
    const expectedTypebox = `
    Type.Object({
      name: Type.Optional(Type.String()),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with string that has schemaOptions", () => {
    // src for properties
    // 1. https://datatracker.ietf.org/doc/html/draft-wright-json-schema-validation-00#section-5
    // (careful, this is 2020 spec src):
    // 2. https://json-schema.org/draft/2020-12/json-schema-validation.html#name-validation-keywords-for-num
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "name": {
          "description": "full name of the person",
          "minLength": 1,
          "maxLength": 100,
          "pattern": "^[a-zA-Z]+(s)+[a-zA-Z]+$",
          "type": "string"
        }
      }
    }
    `;
    const expectedTypebox = `
    Type.Object({
      name: Type.Optional(
        Type.String({
          description: "full name of the person",
          minLength: 1,
          maxLength: 100,
          pattern: "^[a-zA-Z]+(\s)+[a-zA-Z]+$",
        })
      ),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with required number property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "age": {
          "type": "number"
        }
      },
      "required": [
        "age"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      age: Type.Number()
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
});
