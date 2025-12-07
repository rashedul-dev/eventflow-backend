export const VALID_PERIODS = ["today", "week", "month", "quarter", "year", "custom"] as const;
export type ValidPeriod = (typeof VALID_PERIODS)[number];

/**
 * Return the requested keys, but only if they are strings.
 * Non-string values become `undefined`.
 */
export function cleanQuery<T extends Record<string, unknown>>(
  query: T,
  keys: (keyof T)[]
): { [K in keyof T]?: string } {
  const out = {} as { [K in keyof T]?: string };

  keys.forEach((k) => {
    const v = query[k];
    if (typeof v === "string") out[k] = v;
  });

  return out;
}
