export type PartialUnknown<T> = {
  [K in keyof T]?: unknown;
};
export const isPartialUnknown = <T>(u: unknown): u is PartialUnknown<T> => {
  return u !== null && typeof u === 'object';
};
export const isRecordOf = <T>(u: unknown, isT: (u: unknown) => u is T): u is Record<string, T> => {
  return isPartialUnknown<Record<string, unknown>>(u) && Object.values(u).every(isT);
};
