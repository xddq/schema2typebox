// @ts-check
const { TypeRegistry, Type, Kind } = require('@sinclair/typebox');
const { Value } = require('@sinclair/typebox/value');

TypeRegistry.Set('ExtendedOneOf', 
  /** @type {(schema: any, value: unknown) => boolean} */
  (schema, value) => {
    return 1 === schema.oneOf.reduce(
      /** @type {(acc: number, schema: any) => number} */
      (acc, schema) => acc + (Value.Check(schema, value) ? 1 : 0), 
    0);
});

/**
 * @template {import("@sinclair/typebox").TSchema[]} T
 * @param {[...T]} oneOf
 * @param {import("@sinclair/typebox").SchemaOptions} options
 * @returns {ReturnType<typeof Type.Unsafe<import("@sinclair/typebox").Static<import("@sinclair/typebox").TUnion<T>>>>}
 */
function OneOf(oneOf, options = {}) {
    // credit: https://github.com/microsoft/TypeScript/issues/27387#issuecomment-1223795056
    return /** @type {typeof Type.Unsafe<import("@sinclair/typebox").Static<import("@sinclair/typebox").TUnion<T>>>} */ (Type.Unsafe)({ ...options, [Kind]: 'ExtendedOneOf', oneOf });
};

console.log(OneOf([Type.Object({"three": Type.Number()}), Type.Object({ "farquad": Type.String()})]));

module.exports.OneOf = OneOf;
