import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CurrencyCode } from '../../types';
import { formatMoney } from '../../utils/currencyUtils';

export default function ExpensePeriodChart({ rows, currency }: { rows: { month: string; amount: number }[]; currency: CurrencyCode }) {
  return <ResponsiveContainer width="100%" height="100%">
    <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 10 }} width={48} />
      <Tooltip formatter={(value: number) => formatMoney(value, currency)} />
      <Bar dataKey="amount" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>;
}
