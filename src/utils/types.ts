export type MaybeObject<T extends {}> = {
  [K in keyof T]?: unknown;
};
export const isObjectMaybe = <T extends {}>(u: unknown): u is MaybeObject<T> => {
  return u !== null && typeof u === 'object';
};
export const isObjectOf = <T>(u: unknown, isT: (u: unknown) => u is T): u is Record<string, T> => {
  if (!isObjectMaybe<Record<string, unknown>>(u)) return false;
  for (const k in u) {
    if (!isT(u[k])) return false;
  }
  return true;
};
