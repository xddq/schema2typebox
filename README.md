<h1 align="center">
    Schema2TypeBox
</h1>

<p align="center">
Cli tool used for converting JSON schema draft-06 files to TypeBox code.
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

## Usage

- The cli can be used with `schema2typebox --input <fileName> --output <fileName>`,
  or by simply running `schema2typebox`. The input defaults to "schema.json" and the
  output to "generated-types.ts" relative to the current working directory. For more
  see [cli usage](#cli-usage).

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
- [x] Type.Union() via "anyOf" property
- [x] Type.Intersect() via "allOf" property
- [x] SchemaOptions for everything that is implemented
- [x] Type.Enum() via "enum" property
  - NOTE: Interesting that Type.Enum() creates a json schema with a list of
    anyOf consts instead of enum.
- [x] $ref to other schema files via relative path
- [x] name of generated value and type based on "title" attribute
  - are there other attributes one should check if "title" is undefined?
- [ ] (low prio?) $ref to definitions inside the current schema
  - NOTE: perhaps wait and see if people mention the need
  - Initial idea to implement this via collecting all $defs in a "preprocessing"
    step inside a map and whenever we get a $ref we query the map to insert the
    correct type.
- [ ] (low prio) $ref to remote schemas
- [ ] (low prio) Type.Tuple() via "array" instance type with minimalItems,
      maximalItems and additionalItems false
- [ ] (low prio) Type.Not() via "not" property
  - TODO: Is this even possible? I am confused.

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

    schema2typebox is a cli tool for converting JSON schema draft-06 files to
    typebox code.  The generated output is formatted based on the prettier
    config inside your repo (or the default one, if you don't have one).
    Version: ${packageJson.version}

    Usage:

    schema2typebox [ARGUMENTS]

    Arguments:

    -h, --help
       Displays this menu.

    -i, --input
       Specifies the relative path to the file containing the JSON schema that
       will be used to generated typebox types. Defaults to "schema.json".

    -o, --output
       Specifies the relative path to generated file that will contain the
       typebox code. Defaults to "generated-types.ts".

    --output-stdout
       Does not generate an output file and prints the generated code to stdout
       instead. Has precedence over -o/--output.

```

### The stuff below is left over from copying from using the template from

[here](https://github.com/xddq/nodejs-typescript-modern-starter) and can be read
through for understanding the basic setup.

# Node.js Typescript Modern Starter

While developing with Typescript and Node.js is awesome, **setting up a new
project is painful**.
This minimal and modern starter repo is here to help you get started with
Node.js and Typecript without the pain.

## Overview

This starter uses a bare-bones and minimal approach to get anyone up and
running with a new project in no time. It provides:

- Typescript 5 with a strict tsconfig.
- Yarn/Npm scripts ready to do everything you commonly need. Supporting `build`,
  `clean`, `test`, `bundle`, `dev` and `start`. These scripts are created to be
  compatible with the operating systems linux, macos and windows.
- Github Actions in place runnung with current node version (18,20) on linux,
  macos and windows to automatically (for each PR):
  - build and test the code
  - check for formatting issues
  - lint the codebase
- Testing via the new Node.js [test
  runner](https://nodejs.org/api/test.html#test-runner) instead of something
  like mocha or jest.
- Formatting via [prettier](https://prettier.io/).
- Linting via [eslint](https://eslint.org/) and
  [typescript-eslint](https://typescript-eslint.io/)
- Bundling via [esbuild](https://esbuild.github.io/), a fast bundler that "just
  works" and is nowadays even used in the typescript codebase.
- Using the current LTS, Node.js 18

#### Project Goals

- Help you to just **get started** with a Node.js Typescript setup and **not
  worry about configuration**.
- All scripts compatible with linux, macos and windows.
- No magic. Everything kept as simple as possible while configuring anything you
  might need.
- Advocate for **testing your code**. The common approaches of _tests and code
  side by side_ as well as _all tests in a seperate folder_ already working and
  set up for you.
- Advocate for **using CI/CD** (in this case Github Actions). Automatically
  check formatting, linting and build and test the code base. Everything running
  on each PR.
- Advocate establishing best practices via linting rules using eslint and
  typescript-eslint. However, still giving a documented way to quickly and
  easily disable them, if that is preferred.
- Use modern tools like esbuild, typescript 5 and the nodejs test runner.
- Be open for any framework or library that you prefer. This setup should be
  useful to everyone. You can easily add your preferred packages in to time.

## Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) (or something like
  [nvm-windows](https://github.com/coreybutler/nvm-windows) if you are on
  windows)

## Quickstart

- Clone the repo `git clone git@github.com:xddq/nodejs-typescript-modern-starter`
- Remove the .git folder `cd nodejs-typescript-modern-starter && rm -rf .git`
- (optional) Update the package.json name, author, keywords, etc..
- Set up your own git folder and create your first commit. Run `git init && git
add . && git commit -am "initial commit"`
- (optional) Set up the git hook for formatting your code. `cp
.git-hooks/pre-commit .git/hooks/pre-commit`. For windows you need to use
  [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) to use this.
- Use the node version specified in .nvmrc `nvm install && nvm use`
- Install dependencies `npm i -g yarn && yarn`
- You're done🎉 What about you try running the tests? Run `yarn test`. See the
  section below for all available commands together with their explanation.

## Scripts and their explanation

All scripts can be found inside the package.json file under the "scripts"
attribute. They simply invoke the `tasks.mjs` file which handles the logic
behind these scripts. The `tasks.mjs` file was created in order to be able to
easily implement operating system dependant code and leverage comments. You can
just take a look inside the tasks.mjs file in order to understand what is going
on behind the scenes. It contains comments for every script.

- `yarn build` -> Builds the project. It transpiles the typescript code to
  javascript and stores the output inside the dist folder. Deletes any files
  from previous builds beforehand to become repeatable/idempotent.
- `yarn bundle` -> Bundles the whole code into a single javascript file which
  will be stored inside the bundle folder.
- `yarn clean` -> Removes built files. Deletes the dist and bundle directory and
  the files inside of them. Normally there is no need to invoke this manually.
- `yarn dev` -> This should be used for running the code while developing. It
  watches all changes you make to your typescript codebase and automatically
  rebuilds the project. It does also watch all changes made to the built project
  and restarts the code whenever changes are detected. This enables a quick
  feedback loop.
- `yarn format` -> Formats the code using prettier.
- `yarn format-check` -> Checks for formatting errors using prettier. This is
  typically only invoked by the CI/CD pipeline.
- `yarn lint` -> Lints the code using eslint. Fixes problems that are
  auto-fixable and reports the rest of them to you.
- `yarn lint-check` -> Checks for linting errors using eslint. This is typically
  only invoked by the CI/CD pipeline.
- `yarn start` -> Runs the code. This only works if the code was built before ;).
- `yarn test` -> Tests your codebase. Basic tests are created for both major
  approaches of putting tests beside the source code as well as putting tests in
  a seperate folder.

## Linting

This repo has [eslint](https://eslint.org/) and
[typescript-eslint](https://typescript-eslint.io/) as well as an automated
Github Action to check for linting set up and ready to go.

The rules in this project are my personal preference and reflect a subset of the
recommended options. They also include a lot of the more strict options (NOT
included in the recommended ones). My goal is to simplify having a consistent
code base/code style, to avoid catchable bugs early and advocate for usage of
newer features of the language.

However, I made it **dead simple** to enable the default/recommended eslint
rules, if you want to use them instead. Everything is documented, just browse to
[./eslintrc.cjs](https://github.com/xddq/nodejs-typescript-modern-starter/blob/main/eslintrc.cjs)
and adapt the code.
