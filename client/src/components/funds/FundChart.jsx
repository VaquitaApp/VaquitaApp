import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fmtCLP } from '../../utils/format';

function groupByPeriod(contributions, byWeek) {
  const map = {};
  for (const c of contributions) {
    const d = new Date(c.date);
    let periodStart;
    if (byWeek) {
      periodStart = new Date(d);
      periodStart.setDate(d.getDate() - d.getDay());
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = new Date(d);
      periodStart.setHours(0, 0, 0, 0);
    }
    const ts = periodStart.getTime();
    if (!map[ts]) map[ts] = { ts, label: periodStart.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }), total: 0 };
    map[ts].total += c.amount;
  }
  return Object.values(map)
    .sort((a, b) => a.ts - b.ts)
    .map(({ label, total }) => ({ name: label, total }));
}


export default function FundChart({ contributions = [], deadline }) {
  if (contributions.length === 0) {
    return <p className="text-sm text-gray-400">Sin datos para mostrar.</p>;
  }

  const daysLeft = (new Date(deadline) - Date.now()) / 86400000;
  const byWeek = daysLeft > 30;
  const data = groupByPeriod(contributions, byWeek);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={v => fmtCLP(v)} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
        <Bar dataKey="total" fill="#6366f1" radius={[3, 3, 0, 0]} name="Aportes" />
      </BarChart>
    </ResponsiveContainer>
  );
}
