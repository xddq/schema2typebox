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

The package is focused on supporting JSON schema draft-06 files, since this is
the target TypeBox officially supports. _These types are fully compatible with
the JSON Schema Draft 6 specification._ (from typebox repo).

However, since the amount of breaking changes is quite small between most JSON
schema specs, support for other specs may "just work" or be implemented at a
later stage. Feel free to open a discussion or issue when you find problems.
Happy about contributions if you want to help out.

- [x] draft-04
- [x] draft-06 (main goal of this package, see Feature List for the state)
- [x] draft-07
- [x] draft-2019-09
- should be working with the _current feature set_
- [ ] draft-2020-12
  - Probably not working due to new keywords or semantic changes for previous
    keywords. Happy about issues with your JSON schema, expected TypeBox code
    and the currently generated TypeBox code.

### Feature List

Tracking the progress/features of `JSON schema -> TypeBox` transformation to see
whats already implemented and what is missing.

- [x] Type.String() via "string" instance type
- [x] Type.Boolean() via "boolean" instance type
- [x] Type.Number() via "number" instance type
- [x] Type.Null() via "null" instance type
- [x] Type.Array() via "array" instance type
- [x] Type.Object() via "object" instance type
- [x] Type.Literal() via "const" property
- [x] Type.Union() via "anyOf" or "enum" property
  - schema2typebox generates union types instead of enums. If you have a problem
    with this behaviour and valid arguments for using enums please create an
    issue and it may be considered again.
- [x] Type.Intersect() via "allOf" property
- [x] OneOf() via "oneOf" property
  - This adds oneOf to the typebox type registry as (Kind: 'ExtendedOneOf') in
    order to be able to align to oneOf json schema semantics and still be able
    to use the typebox compiler. [More
    info](https://github.com/xddq/schema2typebox/issues/16).
- [x] Type.Not() via "not" property
- [x] schemaOptions
- [x] $refs anywhere using [@apidevtools/json-schema-ref-parser](https://github.com/APIDevTools/json-schema-ref-parser)
- [x] Name of generated value and type based on existing "title" attribute.
      Defaulting to "T" if title is not defined.
- [ ] (low prio) Type.Tuple() via "array" instance type with minimalItems,
      maximalItems and additionalItems false

#### Open Tasks

See [here](https://github.com/xddq/schema2typebox/pull/23) and followup PRs.

- [ ] Type.Array() with "array<enum>" instance type
- [ ] Nullable Literal types, eg: `type: ['string', 'null']`
- [ ] "Unknown" object types
- [ ] Disambiguation of overlapping property names in nested schemas

## DEV/CONTRIBUTOR NOTES

- If you have an idea or want to help implement something, feel free to do so.
  Please always start by creating a discussion post to avoid any unnecessary
  work.
  - Please always create tests for new features that are implemented. This will
    decrease mental overhead for reviewing and developing in the long run.
- See specification for JSON schema draft-06
  [here](https://json-schema.org/specification-links.html#draft-6)
- Link to [meta schema](http://json-schema.org/draft-06/schema). Meta schema
  means that a JSON schema is created in order to validate that a given schema
  adheres to a given JSON schema draft.

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

This project aims for high code coverage. When you add new features or fix a
bug, please add a test for it. This is what I could get out of the [experimental
code coverage](https://nodejs.org/api/test.html#collecting-code-coverage) from
node test runner in v20.03.1. Was run with code from 28.06.2023.

| File                           | Line % | Branch % | Funcs % |
| ------------------------------ | ------ | -------- | ------- |
| dist/src/programmatic-usage.js | 95.83  | 53.33    | 80.00   |
| dist/src/schema-to-typebox.js  | 92.06  | 86.54    | 94.74   |

While I enjoy using the test runner from nodejs itself,
this feature is still lacking.

### Template Repo

Template for the repo setup was taken from [here](https://github.com/xddq/nodejs-typescript-modern-starter).
