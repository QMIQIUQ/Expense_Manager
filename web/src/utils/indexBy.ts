/** Preserve source order within each group, including duplicate candidates. */
export const indexBy = <T,>(rows: readonly T[], key: (row: T) => string | undefined): Map<string, T[]> => {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    if (value === undefined) continue;
    const group = result.get(value);
    if (group) group.push(row); else result.set(value, [row]);
  }
  return result;
};
