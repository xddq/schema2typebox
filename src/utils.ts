// for now just copy pasting utility functions from fp-ts

/**
 * Apply a function to pairs of elements at the same index in two arrays, collecting the results in a new array. If one
 * input array is short, excess elements of the longer array are discarded.
 *
 * @example
 * import { zipWith } from 'fp-ts/Array'
 *
 * assert.deepStrictEqual(zipWith([1, 2, 3], ['a', 'b', 'c', 'd'], (n, s) => s + n), ['a1', 'b2', 'c3'])
 *
 * src: https://github.com/gcanti/fp-ts/blob/master/src/Array.ts
 * @since 2.0.0
 */
export const zipWith = <A, B, C>(
  fa: Array<A>,
  fb: Array<B>,
  f: (a: A, b: B) => C
): Array<C> => {
  const fc: Array<C> = [];
  const len = Math.min(fa.length, fb.length);
  for (let i = 0; i < len; i++) {
    // @ts-ignore - fa[i] can only be undefined if its an array of undefined.
    // Ignore ts error here.
    fc[i] = f(fa[i], fb[i]);
  }
  return fc;
};

/**
 * Takes two arrays and returns an array of corresponding pairs. If one input array is short, excess elements of the
 * longer array are discarded
 *
 * @example
 * import { zip } from 'fp-ts/Array'
 * import { pipe } from 'fp-ts/function'
 *
 * assert.deepStrictEqual(pipe([1, 2, 3], zip(['a', 'b', 'c', 'd'])), [[1, 'a'], [2, 'b'], [3, 'c']])
 *
 * @since 2.0.0
 * src: https://github.com/gcanti/fp-ts/blob/master/src/Array.ts
 */
export function zip<B>(bs: Array<B>): <A>(as: Array<A>) => Array<[A, B]>;
export function zip<A, B>(as: Array<A>, bs: Array<B>): Array<[A, B]>;
export function zip<A, B>(
  as: Array<A>,
  bs?: Array<B>
): Array<[A, B]> | ((bs: Array<B>) => Array<[B, A]>) {
  if (bs === undefined) {
    return (bs) => zip(bs, as);
  }
  return zipWith(as, bs, (a, b) => [a, b]);
}
