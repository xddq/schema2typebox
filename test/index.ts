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
  test("object with null property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "age": {
          "type": "null"
        }
      },
      "required": [
        "age"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      age: Type.Null()
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with boolean property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "funny": {
          "type": "boolean"
        }
      },
      "required": [
        "funny"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      funny: Type.Boolean()
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with array property and simple type (string)", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "hobbies": {
          "minItems": 1,
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "hobbies"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      hobbies: Type.Array(Type.String(), { minItems: 1 }),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  // TODO: test object with array property and object type
  test("object with object property", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "address": {
          "type": "object",
          "properties": {
            "street": {
              "type": "string"
            },
            "city": {
              "type": "string"
            }
          },
          "required": [
            "street",
            "city"
          ]
        }
      },
      "required": [
        "address"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      address: Type.Object({
      street: Type.String(),
      city: Type.String()
      })
    })
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with const", () => {
    const dummySchema = `
      {
    "type": "object",
    "properties": {
      "nickname": {
        "const": "xddq",
        "type": "string"
      },
      "x": {
        "const": 99,
        "type": "number"
      },
      "y": {
        "const": true,
        "type": "boolean"
      },
      "z": {
        "const": false,
        "type": "boolean"
      },
      "a": {
        "type": "array",
        "items": {
          "const": 1,
          "type": "number"
        }
      },
      "b": {
        "type": "array",
        "items": {
          "const": "hi",
          "type": "string"
        }
      },
      "c": {
        "const": 10,
        "type": "number"
      },
      "d": {
        "type": "array",
        "items": {
          "const": 1,
          "type": "number"
        }
      },
      "e": {
        "type": "array",
        "items": {
          "const": "hi",
          "type": "string"
        }
      }
    },
    "required": [
      "nickname",
      "x",
      "y",
      "z",
      "a",
      "b"
    ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      nickname: Type.Literal("xddq"),
      x: Type.Literal(99),
      y: Type.Literal(true),
      z: Type.Literal(false),
      a: Type.Array(Type.Literal(1)),
      b: Type.Array(Type.Literal("hi")),
      c: Type.Optional(Type.Literal(10)),
      d: Type.Optional(Type.Array(Type.Literal(1))),
      e: Type.Optional(Type.Array(Type.Literal("hi"))),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with anyOf", () => {
    const dummySchema = `
    {
      "type": "object",
      "properties": {
        "a": {
          "anyOf": [
            {
              "const": 1,
              "type": "number"
            },
            {
              "const": 2,
              "type": "number"
            }
          ]
        },
        "b": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "a",
        "b"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      a: Type.Union([Type.Literal(1), Type.Literal(2)]),
      b: Type.Union([Type.String(), Type.Number(), Type.Null()]),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
  test("object with allOf", () => {
    const dummySchema = `
      {
      "type": "object",
      "properties": {
        "a": {
          "allOf": [
            {
              "const": 1,
              "type": "number"
            },
            {
              "const": 2,
              "type": "number"
            }
          ]
        },
        "b": {
          "allOf": [
            {
              "type": "string"
            },
            {
              "type": "number"
            }
          ]
        },
        "c": {
          "description": "intersection of two types",
          "allOf": [
            {
              "description": "important",
              "type": "string"
            },
            {
              "minimum": 1,
              "type": "number"
            }
          ]
        }
      },
      "required": [
        "a",
        "c"
      ]
    }
    `;
    const expectedTypebox = `
    Type.Object({
      a: Type.Intersect([Type.Literal(1), Type.Literal(2)]),
      b: Type.Optional(Type.Intersect([Type.String(), Type.Number()])),
      c: Type.Intersect(
        [Type.String({ description: "important" }), Type.Number({ minimum: 1 })],
        {description: "intersection of two types",}
      ),
    });
    `;
    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
  });
});
