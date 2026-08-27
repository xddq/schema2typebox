# 1.8.0

- support recursive / self-referential JSON schemas: emit `Type.Recursive(...)`
  instead of crashing on circular `$ref` graphs. Recursive `oneOf` branches are
  emitted as `Type.Union` so self-references validate correctly.
  [src](https://github.com/xddq/schema2typebox/issues/62)

# 1.7.8

- Support empty `properties` field like `{"type": "object", "properties": {}}`, suport additionalProperties when other properties are defined [src](https://github.com/xddq/schema2typebox/pull/59)

# 1.7.7

- support `Type.Record(Type.String(), <T>)` generation from empty objects using additionalProperties [src](https://github.com/xddq/schema2typebox/pull/58)

# 1.7.6

- support `title` fields containing characters '- .\_' [src](https://github.com/xddq/schema2typebox/pull/53)

# 1.7.5

- parse {} as Type.Unknown() [src](https://github.com/xddq/schema2typebox/pull/51)

# 1.7.4

- support unions containing objects and/or arrays [src](https://github.com/xddq/schema2typebox/pull/48)

# 1.7.3

- always quote properties to avoid futher issues with regex missing out on
  uncommon naming schemes. [src](https://github.com/xddq/schema2typebox/pull/47)

# 1.7.2

- allow array schemas that don't specify a type for the array items. [src](https://github.com/xddq/schema2typebox/pull/42)

# 1.7.1

- fix typebox code generation for JSON schemas which use property names like
  (without the quotes) "@test", "1", or "some with spaces".

[src](https://github.com/xddq/schema2typebox/pull/36)

# 1.7.0

- ensure generation of $id as schema option in resulting typebox code (#33)
  [src](https://github.com/xddq/schema2typebox/pull/33)
