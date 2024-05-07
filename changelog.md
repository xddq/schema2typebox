# 1.7.3

- support unions containing objects and/or arrays

  ```json
  { 
    "type": "object",
    "properties":  {
      "nullableObject": {
        "type": ["object", "null"],
        "properties": {}
      },
      "nullableArray": {
        "type": ["array", "null"],
        "items": {}
      }
    }
  }
  ```
  
# 1.7.2

- allow array schemas that don't specify a type for the array items. [src](https://github.com/xddq/schema2typebox/pull/42)

# 1.7.1

- fix typebox code generation for JSON schemas which use property names like
  (without the quotes) "@test", "1", or "some with spaces".

[src](https://github.com/xddq/schema2typebox/pull/36)

# 1.7.0

- ensure generation of $id as schema option in resulting typebox code (#33)
  [src](https://github.com/xddq/schema2typebox/pull/33)
