import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import shell from "shelljs";

import {
  resetEnumCode,
  resetCustomTypes,
} from "../src/schema-to-typebox";
import {
  addCommentThatCodeIsGenerated,
  schema2typebox,
} from "../src/programmatic-usage";
import { zip } from "fp-ts/Array";
import { SHELLJS_RETURN_CODE_OK, buildOsIndependentPath, expectEqualIgnoreFormatting } from "./utils";

// NOTE: Rather test the collect() function whenever we can instead
// of schema2typebox.
describe("programmatic usage API", () => {
    // TODO: remove this once global state enumCode and customCode were removed
    afterEach(() => {
      resetEnumCode();
      resetCustomTypes();
    });
    test("object with enum (all keys string)", async () => {
      const dummySchema = `
       {
        "type": "object",
        "properties": {
          "status": {
           "enum": [
             "unknown",
             "accepted",
             "denied"
           ]
          }
        },
        "required": [
          "status"
        ]
      }
      `;
      const expectedTypebox = addCommentThatCodeIsGenerated.run(`
      import { Static, Type } from "@sinclair/typebox";
  
      export const StatusUnion = Type.Union([
        Type.Literal("unknown"),
        Type.Literal("accepted"),
        Type.Literal("denied"),
      ])
  
      export type T = Static<typeof T>
      export const T = Type.Object({
        status: StatusUnion
      })
      `);
      expectEqualIgnoreFormatting(
        await schema2typebox({ input: dummySchema }),
        expectedTypebox
      );
    });
    test("object with enum (mixed types for keys) and optional enum with string keys", async () => {
      const dummySchema = `
       {
        "type": "object",
        "properties": {
          "status": {
           "enum": [
             1,
             true,
             "hello"
           ]
          },
          "optionalStatus": {
           "enum": [
            "unknown",
            "accepted",
            "denied"]
          }
        },
        "required": [
          "status"
        ]
      }
      `;
      const expectedTypebox = addCommentThatCodeIsGenerated.run(`
      import { Static, Type } from "@sinclair/typebox";
  
      export const StatusUnion = Type.Union([
        Type.Literal(1),
        Type.Literal(true),
        Type.Literal("hello"),
      ])
  
      export const OptionalStatusUnion = Type.Union([
        Type.Literal("unknown"),
        Type.Literal("accepted"),
        Type.Literal("denied"),
      ])
  
      export type T = Static<typeof T>
      export const T = Type.Object({
        status: StatusUnion,
        optionalStatus: Type.Optional(OptionalStatusUnion)
      })
      `);
      expectEqualIgnoreFormatting(
        await schema2typebox({ input: dummySchema }),
        expectedTypebox
      );
    });
    test("generated typebox names are based on title attribute", async () => {
      const dummySchema = `
      {
        "title": "Contract",
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          }
        },
        "required": ["name"]
      }
      `;
      const expectedTypebox = addCommentThatCodeIsGenerated.run(`
      import { Static, Type } from "@sinclair/typebox";
  
      export type Contract = Static<typeof Contract>;
      export const Contract = Type.Object({
        name: Type.String(),
      });
      `);
      expectEqualIgnoreFormatting(
        await schema2typebox({ input: dummySchema }),
        expectedTypebox
      );
    });
    test("object with $ref pointing to external files in relative path", async () => {
      const dummySchema = `
      {
        "title": "Contract",
        "type": "object",
        "properties": {
          "person": {
            "$ref": "person.json"
          },
          "status": {
            "$ref": "status.json"
          }
        },
        "required": ["person"]
      }
      `;
  
      const referencedPersonSchema = `
      {
        "title": "Person",
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "maxLength": 100
          },
          "age": {
            "type": "number",
            "minimum": 18
          }
        },
        "required": ["name", "age"]
     }
     `;
  
      const referencedStatusSchema = `
      {
        "title": "Status",
        "enum": ["unknown", "accepted", "denied"]
      }
      `;
  
      const expectedTypebox = addCommentThatCodeIsGenerated.run(`
        import { Static, Type } from "@sinclair/typebox";
  
        export const StatusUnion = Type.Union([
          Type.Literal("unknown"),
          Type.Literal("accepted"),
          Type.Literal("denied"),
        ]);
  
        export type Contract = Static<typeof Contract>;
        export const Contract = Type.Object({
          person: Type.Object({
            name: Type.String({ maxLength: 100 }),
            age: Type.Number({ minimum: 18 }),
          }),
          status: Type.Optional(StatusUnion),
        });
      `);
  
      const inputPaths = ["person.json", "status.json"].flatMap((currItem) =>
        buildOsIndependentPath([__dirname, "..", "..", currItem])
      );
      zip(inputPaths, [referencedPersonSchema, referencedStatusSchema]).map(
        ([fileName, data]) => fs.writeFileSync(fileName, data, undefined)
      );
  
      expectEqualIgnoreFormatting(
        await schema2typebox({ input: dummySchema }),
        expectedTypebox
      );
  
      // cleanup generated files
      const { code: returnCode } = shell.rm("-f", inputPaths);
      assert.equal(returnCode, SHELLJS_RETURN_CODE_OK);
    });
    test("object with $ref inside anyOf", async () => {
      const dummySchema = {
        anyOf: [{ $ref: "./cat.json" }, { $ref: "./dog.json" }],
      };
  
      const referencedCatSchema = {
        title: "Cat",
        type: "object",
        properties: {
          type: {
            type: "string",
            const: "cat",
          },
          name: {
            type: "string",
            maxLength: 100,
          },
        },
        required: ["type", "name"],
      };
  
      const referencedDogSchema = {
        title: "Dog",
        type: "object",
        properties: {
          type: {
            type: "string",
            const: "dog",
          },
          name: {
            type: "string",
            maxLength: 100,
          },
        },
        required: ["type", "name"],
      };
      const expectedTypebox = addCommentThatCodeIsGenerated.run(`
        import { Static, Type } from "@sinclair/typebox";
  
        export type T = Static<typeof T>;
        export const T = Type.Union([
          Type.Object({
            type: Type.Literal("cat"),
            name: Type.String({ maxLength: 100 }),
          }),
          Type.Object({
            type: Type.Literal("dog"),
            name: Type.String({ maxLength: 100 }),
          }),
        ]);
      `);
  
      const inputPaths = ["cat.json", "dog.json"].flatMap((currItem) =>
        buildOsIndependentPath([__dirname, "..", "..", currItem])
      );
      zip(inputPaths, [referencedCatSchema, referencedDogSchema]).map(
        ([fileName, data]) =>
          fs.writeFileSync(fileName, JSON.stringify(data), undefined)
      );
  
      expectEqualIgnoreFormatting(
        await schema2typebox({ input: JSON.stringify(dummySchema) }),
        expectedTypebox
      );
  
      // cleanup generated files
      const { code: returnCode } = shell.rm("-f", inputPaths);
      assert.equal(returnCode, SHELLJS_RETURN_CODE_OK);
    });
    // NOTE: This test might break if github adapts their links to raw github user
    // content. The branch "feature/fix-refs-using-refparser" will not be deleted.
    test("object with $ref to remote files", async () => {
      const dummySchema = {
        anyOf: [
          {
            $ref: "https://raw.githubusercontent.com/xddq/schema2typebox/main/examples/ref-to-remote-files/cat.json",
          },
          {
            $ref: "https://raw.githubusercontent.com/xddq/schema2typebox/main/examples/ref-to-remote-files/dog.json",
          },
        ],
      };
  
      const expectedTypebox = addCommentThatCodeIsGenerated.run(`
        import { Static, Type } from "@sinclair/typebox";
  
        export type T = Static<typeof T>;
        export const T = Type.Union([
          Type.Object({
            type: Type.Literal("cat"),
            name: Type.String({ maxLength: 100 }),
          }),
          Type.Object({
            type: Type.Literal("dog"),
            name: Type.String({ maxLength: 100 }),
          }),
        ]);
      `);
  
      expectEqualIgnoreFormatting(
        await schema2typebox({ input: JSON.stringify(dummySchema) }),
        expectedTypebox
      );
    });
    test("object with oneOf generates custom typebox TypeRegistry code", async () => {
      const dummySchema = `
      {
        "type": "object",
        "properties": {
          "a": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "number"
              }
            ]
          }
        },
        "required": ["a"]
      }
      `;
      const expectedTypebox = addCommentThatCodeIsGenerated.run(`
        import {
          Kind,
          SchemaOptions,
          Static,
          TSchema,
          TUnion,
          Type,
          TypeRegistry,
        } from "@sinclair/typebox";
        import { Value } from "@sinclair/typebox/value";
  
        TypeRegistry.Set(
          "ExtendedOneOf",
          (schema: any, value) =>
            1 ===
            schema.oneOf.reduce(
              (acc: number, schema: any) => acc + (Value.Check(schema, value) ? 1 : 0),
              0
            )
        );
  
        const OneOf = <T extends TSchema[]>(
          oneOf: [...T],
          options: SchemaOptions = {}
        ) => Type.Unsafe<Static<TUnion<T>>>({ ...options, [Kind]: "ExtendedOneOf", oneOf });
  
        export type T = Static<typeof T>;
        export const T = Type.Object({
          a: OneOf([Type.String(), Type.Number()]),
        });
      `);
      expectEqualIgnoreFormatting(
        await schema2typebox({ input: dummySchema }),
        expectedTypebox
      );
    });
  });
  