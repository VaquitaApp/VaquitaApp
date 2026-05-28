import { fmtCLP, fmtDate, fmtName } from '../../utils/format';

export default function ContributionList({ contributions = [] }) {
  if (contributions.length === 0) {
    return <p className="text-sm text-[var(--vaq-muted)]">Sin aportes registrados aún.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--vaq-card-border)] text-xs text-[var(--vaq-muted)]">
            <th className="py-2 pr-4 text-left font-medium">Participante</th>
            <th className="py-2 pr-4 text-left font-medium">Monto</th>
            <th className="py-2 text-left font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map((c) => (
            <tr key={c._id} className="border-b border-[var(--vaq-card-border)] hover:bg-[var(--vaq-well-bg)]">
              <td className="py-2 pr-4">
                <p className="font-medium text-[var(--vaq-ink)]">{fmtName(c.user?.name) || '—'}</p>
                <p className="text-xs text-[var(--vaq-muted)]">{c.user?.email}</p>
              </td>
              <td className="py-2 pr-4 font-medium text-[var(--vaq-forest)]">
                {fmtCLP(c.amount)}
                {c.quotasPaid > 1 && <span className="block text-xs text-[var(--vaq-muted)] font-normal">(Pago de {c.quotasPaid} cuotas)</span>}
                {c.quotasPaid === 1 && <span className="block text-xs text-[var(--vaq-muted)] font-normal">(Pago de 1 cuota)</span>}
              </td>
              <td className="py-2 text-[var(--vaq-muted)]">{fmtDate(c.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
