<!--
  Hey👋 Thanks for creating an issue! Please ensure that you fill out the issue template in order to get feedback and help!
Do you have an idea for a new feature? Want to discuss some decisions? These kind of posts should be posted inside the Discussions tab!
-->

<!-- the version of schema2typebox you are using -->

Library version:

<!-- pick the version of the schema you are using -->

JSON schema version: draft-04, draft-06, draft-07, 2019-09, 2020-12

<!-- contributions are always welcome, pick one of the below and remove the other -->

I am willing to contribute to fix the issue 💚
I won't contribute to fix the issue ❌

<!--
  Please put at least one sentence for each point. This will greatly increase the response rate and speed.
-->

## The current behavior

## The expected behavior

<!-- If you have an idea about why this happened, or know how to fix it (or work around it?) write it down! -->

## Why does it happen? What/How to fix the issue?

## Content of minimal json schema file which causes the problem

<details>
  <summary>Click to expand/collapse</summary>

<!-- please replace with a minimal schema. This will greatly help fixing the issue -->

```json
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
```

</details>
