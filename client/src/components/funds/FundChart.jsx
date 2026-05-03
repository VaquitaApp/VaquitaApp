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
    return <p className="text-sm text-[var(--vaq-muted)]">Sin datos para mostrar.</p>;
  }

  // eslint-disable-next-line react-hooks/purity -- granularidad del gráfico según tiempo restante hasta el cierre
  const byWeek = (new Date(deadline).getTime() - Date.now()) / 86400000 > 30;
  const data = groupByPeriod(contributions, byWeek);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--vaq-progress-track)" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--vaq-muted)' }} />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--vaq-muted)' }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(v) => fmtCLP(v)}
          labelStyle={{ fontSize: 11, color: 'var(--vaq-ink)' }}
          contentStyle={{
            fontSize: 11,
            background: 'var(--vaq-card)',
            border: '1px solid var(--vaq-card-border)',
            borderRadius: 8,
            color: 'var(--vaq-ink)',
          }}
        />
        <Bar dataKey="total" fill="var(--vaq-progress-fill)" radius={[3, 3, 0, 0]} name="Aportes" />
      </BarChart>
    </ResponsiveContainer>
  );
}
