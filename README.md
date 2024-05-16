<h1 align="center">
    Schema2TypeBox
</h1>

<p align="center">
Creating TypeBox code from JSON schemas.
</p>

<p align="center">
  <a href="https://github.com/xddq/schema2typebox/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="ts2typebox is released under the MIT license." />
  </a>
  <a href="https://www.npmjs.org/package/schema2typebox">
    <img src="https://img.shields.io/npm/v/schema2typebox?color=brightgreen&label=npm%20package" alt="Current npm package version." />
  </a>
  <a href="https://github.com/xddq/schema2typebox/actions/workflows/buildAndTest.yaml">
    <img src="https://github.com/xddq/schema2typebox/actions/workflows/buildAndTest.yaml/badge.svg" alt="State of Github Action" />
  </a>
</p>

## Installation

- `npm i -g schema2typebox`

## Use Case

- You got **JSON schemas** that you want to validate your data against. But you
  also want **automatic type inference** after validating the data. You have
  chosen [typebox](https://github.com/sinclairzx81/typebox) for this, but figured
  that you would need to manually create the typebox code. To avoid this pain, you
  simply use `schema2typebox` to generate the required code for you🎉.

## Usage

- The cli can be used with `schema2typebox --input <fileName> --output
<fileName>`, or by simply running `schema2typebox`. The input defaults to
  "schema.json" and the output to "generated-typebox.ts" relative to the current
  working directory. For more see [cli usage](#cli-usage).

## Examples

```typescript
//
// Let's start with our JSON schema
//

{
  "title": "Person",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 20
    },
    "age": {
      "type": "number",
      "minimum": 18,
      "maximum": 90
    },
    "hobbies": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string"
      }
    },
    "favoriteAnimal": {
      "enum": ["dog", "cat", "sloth"]
    }
  },
  "required": ["name", "age"]
}

//
// Which becomes..
//

export type Person = Static<typeof Person>;
export const Person = Type.Object({
  name: Type.String({ minLength: 20 }),
  age: Type.Number({ minimum: 18, maximum: 90 }),
  hobbies: Type.Optional(Type.Array(Type.String(), { minItems: 1 })),
  favoriteAnimal: Type.Optional(
    Type.Union([
      Type.Literal("dog"),
      Type.Literal("cat"),
      Type.Literal("sloth"),
    ])
  ),
});

//
// You can also split your JSON schema definitions into multiple files when
// using relative paths. Something like this:
//

// person.json
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

// status.json
{
  "title": "Status",
  "enum": ["unknown", "accepted", "denied"]
}

// schema.json
{
  "title": "Contract",
  "type": "object",
  "properties": {
    "person": {
      "$ref": "./person.json"
    },
    "status": {
      "$ref": "./status.json"
    }
  },
  "required": ["person"]
}

//
// Will result in this:
//

export type Contract = Static<typeof Contract>;
export const Contract = Type.Object({
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
});

//
// For an example of programmatic usage check out the examples folder.
//

```

Please take a look at the [feature list](feature-list) below to see the
currently supported features. For examples, take a look into the
[examples](https://github.com/xddq/schema2typebox/tree/main/examples) folder.
You can also check the test cases, every feature is tested.

### Schema Support

The package is focused on supporting JSON schema draft-07 files, since this is
the target TypeBox officially supports. _These types are fully compatible with
the JSON Schema Draft 7 specification._ (from typebox repo 20.08.2023).

However, since the amount of breaking changes is quite small between most JSON
schema specs, support for other specs (draft-04, draft-06, draft-2019-09) should
"just work". Feel free to open a discussion or issue when you find problems.
Happy about contributions if you want to help out. Draft-2020 info can be found
[here](https://github.com/sinclairzx81/typebox/issues/490) not expected to fully
work.

## DEV/CONTRIBUTOR NOTES

If you have an idea or want to help implement something, feel free to do so.
Please always start by creating an issue to avoid any unnecessary work on
either side.

Please always create tests for new features that are implemented. This will
decrease mental overhead for reviewing and developing in the long run.

To understand the JSON schema draft-07 you can check json-schema.org
[here](https://json-schema.org/specification-links.html#draft-7). The meta
schema can be found [here](https://json-schema.org/draft-07/schema).

## cli usage

The following text is the output that will be displayed when you issue
`schema2typebox -h` or `schema2typebox --help`.

```

    schema2typebox generates TypeBox code from JSON schemas. The generated
    output is formatted based on the prettier config inside your repo (or the
    default one, if you don't have one). Version: ${packageJson.version}

    Usage:

    schema2typebox [ARGUMENTS]

    Arguments:

    -h, --help
       Displays this menu.

    -i, --input
       Specifies the relative path to the file containing the JSON schema that
       will be used to generated typebox code. Defaults to "schema.json".

    -o, --output
       Specifies the relative path to generated file that will contain the
       typebox code. Defaults to "generated-typebox.ts".

    --output-stdout
       Does not generate an output file and prints the generated code to stdout
       instead. Has precedence over -o/--output.

```

### Code coverage

This project aims for a high code coverage. When you add new features or fix a
bug, please add an according test for it. The current output (17.05.2024) looks
like this:

| File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s            |
| --------------------- | ------- | -------- | ------- | ------- | ---------------------------- |
| All files             | 85.86   | 75       | 96.87   | 85.86   |
| index.ts              | 100     | 100      | 100     | 100     |
| programmatic-usage.ts | 100     | 66.66    | 100     | 100     | 30                           |
| schema-matchers.ts    | 97.05   | 100      | 90.9    | 97.05   | 63-64                        |
| schema-to-typebox.ts  | 81.4    | 72.64    | 100     | 81.4    | ...0,239,259,309-324,345-346 |

You can inspect the code coverage in depth by running `npx http-server
./coverage/lcov-report` and then browsing http://localhost:8080.

### Template Repo

Template for this repo was taken from [here](https://github.com/xddq/nodejs-typescript-modern-starter).
