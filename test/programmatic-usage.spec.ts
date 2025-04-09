import { describe, test } from "@jest/globals";
import { zip } from "fp-ts/Array";
import fs from "node:fs";
import shell from "shelljs";

import {
  addCommentThatCodeIsGenerated,
  schema2typebox,
} from "../src/programmatic-usage";
import { buildOsIndependentPath, expectEqualIgnoreFormatting } from "./util";

const SHELLJS_RETURN_CODE_OK = 0;

describe("when running the programmatic usage", () => {
  describe("when generating typescript type and typebox value names", () => {
    test.each([
      { title: "Dummy-Title", expectedName: "DummyTitle" },
      { title: "dummy Title", expectedName: "DummyTitle" },
      { title: "dummy_title", expectedName: "DummyTitle" },
      { title: "dummy.title", expectedName: "DummyTitle" },
    ])(
      "generates PascalCase when title contains at least one of '. -_' characters. testing with: $title expecting: $expectedName",
      async ({ title, expectedName }) => {
        const dummySchema = `
    {
      "title": "${title}",
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      },
      "required": ["name"]
    }
    `;
        const expectedTypebox = addCommentThatCodeIsGenerated(`
    import { Static, Type } from "@sinclair/typebox";

    export const Module = Type.Module({
      ${expectedName}: Type.Object({ name: Type.String() }, { $id: "${expectedName}" }),
    });
    export const ${expectedName} = Module.Import("${expectedName}");
    export type ${expectedName} = Static<typeof ${expectedName}>;
    `);
        await expectEqualIgnoreFormatting(
          await schema2typebox({ input: dummySchema }),
          expectedTypebox
        );
      }
    );
    test.each([
      { title: "dummyTitle", expectedName: "DummyTitle" },
      { title: "DummyTitle", expectedName: "DummyTitle" },
      { title: "dummytitle", expectedName: "Dummytitle" },
    ])(
      "enforces capital character and keeps the rest when title does not contain any characters of '. -_'. testing with: $title expecting: $expectedName",
      async ({ title, expectedName }) => {
        const dummySchema = `
    {
      "title": "${title}",
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        }
      },
      "required": ["name"]
    }
    `;
        const expectedTypebox = addCommentThatCodeIsGenerated(`
    import { Static, Type } from "@sinclair/typebox";

    export const Module = Type.Module({
      ${title}: Type.Object({ name: Type.String() }, { $id: "${title}" }),
    });
    export const ${title} = Module.Import("${title}");
    export type ${expectedName} = Static<typeof ${title}>;
    `);
        await expectEqualIgnoreFormatting(
          await schema2typebox({ input: dummySchema }),
          expectedTypebox
        );
      }
    );
  });
  describe("when working with files containing $refs (sanity check of refparser library)", () => {
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

      const expectedTypebox = addCommentThatCodeIsGenerated(`
      import { Static, Type } from "@sinclair/typebox";

      export const Module = Type.Module({
        Contract: Type.Object({
          person: Type.Object({
            name: Type.String({ maxLength: 100 }),
            age: Type.Number({ minimum: 18 }),
          }),
          status: Type.Optional(
            Type.Union([
              Type.Literal("unknown"),
              Type.Literal("accepted"),
              Type.Literal("denied"),
            ])
          ),
        },
        { $id: "Contract" }
        )
      });
      export const Contract = Module.Import("Contract");
      export type Contract = Static<typeof Contract>;
    `);

      const inputPaths = ["person.json", "status.json"].flatMap((currItem) => {
        return buildOsIndependentPath([__dirname, "..", currItem]);
      });
      zip(inputPaths, [referencedPersonSchema, referencedStatusSchema]).map(
        ([fileName, data]) => {
          return fs.writeFileSync(fileName, data, undefined);
        }
      );

      await expectEqualIgnoreFormatting(
        await schema2typebox({ input: dummySchema }),
        expectedTypebox
      );

      // cleanup generated files
      const { code: returnCode } = shell.rm("-f", inputPaths);
      expect(returnCode).toBe(SHELLJS_RETURN_CODE_OK);
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
      const expectedTypebox = addCommentThatCodeIsGenerated(`
      import { Static, Type } from "@sinclair/typebox";

       export const Module = Type.Module({
        T: Type.Union(
          [
            Type.Object({
              type: Type.Literal("cat"),
              name: Type.String({ maxLength: 100 }),
            }),
            Type.Object({
              type: Type.Literal("dog"),
              name: Type.String({ maxLength: 100 }),
            }),
          ],
          { $id: "T" }
        )
      });
      export const T = Module.Import("T");
      export type T = Static<typeof T>;
    `);

      const inputPaths = ["cat.json", "dog.json"].flatMap((currItem) => {
        return buildOsIndependentPath([__dirname, "..", currItem]);
      });
      zip(inputPaths, [referencedCatSchema, referencedDogSchema]).map(
        ([fileName, data]) => {
          return fs.writeFileSync(fileName, JSON.stringify(data), undefined);
        }
      );

      await expectEqualIgnoreFormatting(
        await schema2typebox({ input: JSON.stringify(dummySchema) }),
        expectedTypebox
      );

      // cleanup generated files
      const { code: returnCode } = shell.rm("-f", inputPaths);
      expect(returnCode).toBe(SHELLJS_RETURN_CODE_OK);
    });
    // NOTE: This test might break if github adapts their links to raw github user
    // content.
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

      const expectedTypebox = addCommentThatCodeIsGenerated(`
      import { Static, Type } from "@sinclair/typebox";

      export const Module = Type.Module({
        T: Type.Union(
          [
            Type.Object({
              type: Type.Literal("cat"),
              name: Type.String({ maxLength: 100 }),
            }),
            Type.Object({
              type: Type.Literal("dog"),
              name: Type.String({ maxLength: 100 }),
            }),
          ],
          { $id: "T" }
        )
      });
      export const T = Module.Import("T");
      export type T = Static<typeof T>;
    `);

      await expectEqualIgnoreFormatting(
        await schema2typebox({ input: JSON.stringify(dummySchema) }),
        expectedTypebox
      );
    });
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
    const expectedTypebox = addCommentThatCodeIsGenerated(`
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

      export const Module = Type.Module({
        T: Type.Object({ a: OneOf([Type.String(), Type.Number()]) }, { $id: "T" }),
      });
      export const T = Module.Import("T");
      export type T = Static<typeof T>;
    `);
    await expectEqualIgnoreFormatting(
      await schema2typebox({ input: dummySchema }),
      expectedTypebox
    );
  });
});
