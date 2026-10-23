/** Identifies the amount and account fields that produced a booked account delta. */
export const bookedMovementSource = (movement: { method?: string; accountId?: string; accountName?: string; amount: number; currency?: string; baseAmount?: number; baseCurrency?: string; date: string }): string =>
  JSON.stringify([movement.method, movement.accountId ?? '', movement.accountName ?? '', movement.amount, movement.currency ?? 'MYR', movement.baseAmount ?? null, movement.baseCurrency ?? 'MYR', movement.date]);
