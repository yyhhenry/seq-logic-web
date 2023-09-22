export interface Ok<V> {
  ok: true;
  v: V;
}
export function Ok<V>(v: V): Ok<V> {
  return { ok: true, v };
}
export interface Err<E> {
  ok: false;
  e: E;
}
export function Err<E>(e: E): Err<E> {
  return { ok: false, e };
}
export type Result<V, E> = Ok<V> | Err<E>;
export function tryFn<V>(fn: () => V): Result<V, unknown> {
  try {
    return Ok(fn());
  } catch (e) {
    return Err(e);
  }
}
export async function tryAsyncFn<V>(fn: () => V): Promise<Result<Awaited<V>, unknown>> {
  try {
    return Ok(await fn());
  } catch (e) {
    return Err(e);
  }
}
