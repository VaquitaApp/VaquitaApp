import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function groupByPeriod(contributions, byWeek) {
  const map = {};
  for (const c of contributions) {
    const d = new Date(c.date);
    let key;
    if (byWeek) {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      key = start.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    } else {
      key = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
    }
    map[key] = (map[key] ?? 0) + c.amount;
  }
  return Object.entries(map).map(([name, total]) => ({ name, total }));
}

function fmtCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
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
