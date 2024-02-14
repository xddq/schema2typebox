import { expect } from "chai";
import { JSONSchema7 } from "json-schema";
import { describe, it } from "node:test";
import {
  AllOfSchema,
  AnyOfSchema,
  ArraySchema,
  ConstSchema,
  EnumSchema,
  MultipleTypesSchema,
  NotSchema,
  ObjectSchema,
  OneOfSchema,
} from "../src/schema-matchers";
import {
  parseAllOf,
  parseAnyOf,
  parseArray,
  parseConst,
  parseEnum,
  parseNot,
  parseObject,
  parseOneOf,
  parseTypeName,
  parseWithMultipleTypes,
} from "../src/schema-to-typebox";
import { expectEqualIgnoreFormatting } from "./test-utils";

describe("parser unit tests", () => {
  describe("parseObject() - when parsing an object schema", () => {
    it("returns Type.Unknown() it the object has no properties", () => {
      const dummySchema: ObjectSchema = {
        type: "object",
        properties: undefined,
      };
      const result = parseObject(dummySchema);
      expect(result).to.contain("Type.Unknown");
    });
    it("creates code with attributes for each property", async () => {
      const dummySchema: ObjectSchema = {
        type: "object",
        properties: {
          a: {
            type: "number",
          },
          b: {
            type: "string",
          },
        },
        required: ["b"],
      };
      const result = parseObject(dummySchema);
      const expectedResult = `Type.Object({a: Type.Optional(Type.Number()),\n b: Type.String()})`;
      await expectEqualIgnoreFormatting(result, expectedResult);
    });
    it("quotes property names when required", async () => {
      const dummySchema: ObjectSchema = {
        type: "object",
        properties: {
          "@prop": {
            type: "string",
          },
          "6": {
            type: "boolean",
          },
          unquoted: {
            type: "number",
          },
          __underscores: {
            type: "string",
          },
          " spaces are weirdly valid ": {
            type: "number",
          },
        },
        required: [
          "@prop",
          "6",
          "unquoted",
          "__underscores",
          " spaces are weirdly valid ",
        ],
      };
      const result = parseObject(dummySchema);
      const expectedResult = `Type.Object({"6": Type.Boolean(),\n "@prop": Type.String(),\n unquoted: Type.Number(),\n __underscores: Type.String(),\n " spaces are weirdly valid ": Type.Number()})`;
      await expectEqualIgnoreFormatting(result, expectedResult);
    });
    it("creates code with schemaOptions", async () => {
      const dummySchema: ObjectSchema = {
        $id: "AnyStringHere",
        type: "object",
        properties: {
          a: {
            type: "number",
          },
          b: {
            type: "string",
          },
        },
        required: ["b"],
      };
      const result = parseObject(dummySchema);
      const expectedResult = `Type.Object({a: Type.Optional(Type.Number()),\n b: Type.String()}, { $id: "AnyStringHere" })`;
      await expectEqualIgnoreFormatting(expectedResult, result);
    });
    it("create add record to object if patternProperties attribute is present", async () => {
      const dummySchema: ObjectSchema = {
        type: "object",
        properties: {
          builtin: { type: "number" },
          nested: {
            type: "object",
            properties: {
              a: { type: "string" },
              b: { type: "number" },
            },
          },
        },
        patternProperties: {
          "^S_": { type: "string" },
          "^I_": { type: "integer" },
        },
      };
      const result = parseObject(dummySchema);
      const expectedResult = `
        Type.Object({
          builtin: Type.Number(),
          nested: Type.Object({
            a: Type.String(),
            b: Type.Number(),
          }),
          #######
          Don't Know What to Expect here: 
          #######
          Type.Union(
            [
              Type.Record(Type.String({pattern:"^S_"}), Type.String()), 
              Type.Record(Type.String({pattern: "^I_"}), Type.Number())
            ]),
        })
      `;
      await expectEqualIgnoreFormatting(expectedResult, result);
    });
    it("create a record type if patternProperties is present (array)", async () => {
      const dummySchema: ObjectSchema = {
        type: "object",
        patternProperties: {
          "^(.*)$": {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
      };
      const result = parseObject(dummySchema);
      const expectedResult = `Type.Record(Type.String({pattern:"^(.*)$"}), Type.Array(Type.String()))`;
      await expectEqualIgnoreFormatting(expectedResult, result);
    });
    it("create an union with record types if patternProperties with multiple keys is present", async () => {
      const dummySchema: ObjectSchema = {
        type: "object",
        patternProperties: {
          "^S_": { type: "string" },
          "^I_": { type: "integer" },
        },
        additionalProperties: false,
      };
      const result = parseObject(dummySchema);
      const expectedResult = `
        Type.Union([
          Type.Record(Type.String({pattern:"^S_"}), Type.String(), {additionalProperties: false}), 
          Type.Record(Type.String({pattern: "^I_"}), Type.Number(), {additionalProperties: false})
          ])`;
      await expectEqualIgnoreFormatting(expectedResult, result);
    });
  });

  describe("parseEnum() - when parsing an enum schema", () => {
    it("returns Type.Union()", () => {
      const dummySchema: EnumSchema = {
        title: "Status",
        enum: ["unknown", 1, null],
      };
      const result = parseEnum(dummySchema);
      expect(result).to.contain("Type.Union");
    });
    it("creates code with schemaOptions", () => {
      const dummySchema: EnumSchema = {
        $id: "AnyStringHere",
        title: "Status",
        enum: ["unknown", 1, null],
      };
      const result = parseEnum(dummySchema);
      expect(result).to.contain("Type.Union");
      expect(result).to.contain('{"$id":"AnyStringHere"}');
    });
  });

  describe("parseAnyOf() - when parsing an anyOf schema", () => {
    it("returns Type.Union()", () => {
      const dummySchema: AnyOfSchema = {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "number",
          },
        ],
      };
      const result = parseAnyOf(dummySchema);
      expect(result).to.contain("Type.Union");
    });
    it("creates one type per list of items inside anyOf", () => {
      const dummySchema: AnyOfSchema = {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "number",
          },
        ],
      };
      const result = parseAnyOf(dummySchema);
      expect(result).to.contain("Type.String()");
      expect(result).to.contain("Type.Number()");
    });
    it("creates code with schemaOptions", () => {
      const dummySchema: AnyOfSchema = {
        $id: "AnyStringHere",
        anyOf: [
          {
            type: "string",
          },
          {
            type: "number",
          },
        ],
      };
      const result = parseAnyOf(dummySchema);
      expect(result).to.contain("Type.Union");
      expect(result).to.contain('{"$id":"AnyStringHere"}');
    });
  });

  describe("parseAllOf() - when parsing an allOf schema", () => {
    it("returns Type.Intersect()", () => {
      const schema: AllOfSchema = {
        allOf: [
          {
            type: "string",
          },
        ],
      };
      const result = parseAllOf(schema);
      expect(result).to.contain("Type.Intersect");
    });
    it("creates one type per list of items inside allOf", () => {
      const schema: AllOfSchema = {
        allOf: [
          {
            type: "string",
          },
          {
            type: "number",
          },
        ],
      };
      const result = parseAllOf(schema);
      expect(result).to.contain(`Type.String()`);
      expect(result).to.contain(`Type.Number()`);
    });
    it("creates code with schemaOptions", () => {
      const schema: AllOfSchema = {
        $id: "AnyStringHere",
        allOf: [
          {
            type: "string",
          },
        ],
      };
      const result = parseAllOf(schema);
      expect(result).to.contain('{"$id":"AnyStringHere"}');
    });
  });

  describe("parseOneOf() - when parsing a oneOf schema", () => {
    it("returns OneOf()", () => {
      const schema: OneOfSchema = {
        oneOf: [
          {
            type: "string",
          },
        ],
      };
      const result = parseOneOf(schema);
      expect(result).to.contain(`OneOf`);
    });
    it("creates one type per list of items inside oneOf", () => {
      const schema: OneOfSchema = {
        oneOf: [
          {
            type: "string",
          },
          {
            type: "number",
          },
        ],
      };
      const result = parseOneOf(schema);
      expect(result).to.contain(`Type.String()`);
      expect(result).to.contain(`Type.Number()`);
    });
    it("creates code with schemaOptions", () => {
      const schema: OneOfSchema = {
        $id: "AnyStringHere",
        oneOf: [
          {
            type: "string",
          },
        ],
      };
      const result = parseOneOf(schema);
      expect(result).to.contain('{"$id":"AnyStringHere"}');
    });
  });

  describe("parseNot() - when parsing a not schema", () => {
    it("returns Type.Not()", () => {
      const schema: NotSchema = {
        not: {
          type: "number",
        },
      };
      const result = parseNot(schema);
      expect(result).to.contain(`Type.Not`);
    });
    it("creates code with schemaOptions", () => {
      const schema: NotSchema = {
        $id: "AnyStringHere",
        not: {
          type: "number",
        },
      };
      const result = parseNot(schema);
      expect(result).to.contain('{"$id":"AnyStringHere"}');
    });
  });

  describe("parseArray() - when parsing an array schema", () => {
    describe('when "items" is not a list', () => {
      it("returns Type.Array", () => {
        const schema: ArraySchema = {
          type: "array",
          items: { type: "string" },
        };
        const result = parseArray(schema);
        expect(result).to.contain(`Type.Array`);
      });

      it("creates schemaOptions", () => {
        const schema: ArraySchema = {
          type: "array",
          items: { type: "string", description: "test description" },
        };
        const result = parseArray(schema);
        expect(result).to.contain(
          JSON.stringify({ description: "test description" })
        );
      });
    });

    describe('when "items" is a list', () => {
      it("creates a Type.Union containing each item", () => {
        const schema: ArraySchema = {
          type: "array",
          items: [{ type: "string" }, { type: "null" }],
        };
        const result = parseArray(schema);
        expect(result).to.contain(`Type.Array(Type.Union`);
        expect(result).to.contain(`Type.String`);
        expect(result).to.contain(`Type.Null`);
      });

      it("creates schemaOptions", () => {
        const schema: ArraySchema = {
          type: "array",
          items: [
            { type: "string", description: "test description" },
            { type: "number", minimum: 1 },
          ],
        };
        const result = parseArray(schema);
        expect(result).to.contain(
          JSON.stringify({ description: "test description" })
        );
        expect(result).to.contain(JSON.stringify({ minimum: 1 }));
      });
    });
  });

  describe("parseWithMultipleTypes() - when parsing a schema where 'types' is a list", () => {
    it("returns Type.Union()", () => {
      const schema: MultipleTypesSchema = {
        type: ["string"],
      };
      const result = parseWithMultipleTypes(schema);
      expect(result).to.contain(`Type.Union`);
    });

    it("creates one type for each type in the list", () => {
      const schema: MultipleTypesSchema = {
        type: ["string", "null"],
      };
      const result = parseWithMultipleTypes(schema);
      expect(result).to.contain(`Type.Union`);
      expect(result).to.contain(`Type.String`);
      expect(result).to.contain(`Type.Null`);
    });
  });

  describe("parseConst() - when parsing a const schema", () => {
    it("returns Type.Literal()", () => {
      const schema: ConstSchema = {
        const: "1",
      };
      const result = parseConst(schema);
      expect(result).to.contain(`Type.Literal`);
    });

    it("quotes strings", () => {
      const schema: ConstSchema = {
        const: "1",
      };
      const result = parseConst(schema);
      expect(result).to.contain(`"1"`);
    });

    it("does not quote numbers", () => {
      const schema: ConstSchema = {
        const: 1,
      };
      const result = parseConst(schema);
      expect(result).to.contain(`1`);
      expect(result).not.to.contain(`"1"`);
    });

    it("creates Type.Union() of Type.Literal()s for each item if const is a list", () => {
      const schema: ConstSchema = {
        const: [1, null],
      };
      const result = parseConst(schema);
      expect(result).to.contain(`Type.Union`);
      expect(result).to.contain(`Type.Literal`);
      expect(result).to.contain(`1`);
      expect(result).to.contain(`Type.Null`);
    });
  });

  describe('parseTypeName() - when parsing a type name (e.g. "number", "string", "null" ..)', () => {
    it('creates Type.Number for "number"', () => {
      const result = parseTypeName("number");
      expect(result).to.equal(`Type.Number()`);
    });

    it('applies schemaOptions for "number"', () => {
      const schemaOptions: JSONSchema7 = { description: "test description" };
      const result = parseTypeName("number", schemaOptions);
      expect(result).to.contain(JSON.stringify(schemaOptions));
    });

    it('creates Type.String for "string"', () => {
      const result = parseTypeName("string");
      expect(result).to.equal(`Type.String()`);
    });

    it('applies schemaOptions for "string"', () => {
      const schemaOptions: JSONSchema7 = { description: "test description" };
      const result = parseTypeName("string", schemaOptions);
      expect(result).to.contain(JSON.stringify(schemaOptions));
    });

    it('creates Type.Boolean for "boolean"', () => {
      const result = parseTypeName("boolean");
      expect(result).to.equal(`Type.Boolean()`);
    });

    it('applies schemaOptions for "boolean"', () => {
      const schemaOptions: JSONSchema7 = { description: "test description" };
      const result = parseTypeName("boolean", schemaOptions);
      expect(result).to.contain(JSON.stringify(schemaOptions));
    });

    it('creates Type.Null for "null"', () => {
      const result = parseTypeName("null");
      expect(result).to.equal(`Type.Null()`);
    });

    it('applies schemaOptions for "null"', () => {
      const schemaOptions: JSONSchema7 = { description: "test description" };
      const result = parseTypeName("null", schemaOptions);
      expect(result).to.contain(JSON.stringify(schemaOptions));
    });
  });
});
