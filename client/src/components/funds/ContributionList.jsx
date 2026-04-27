const METHOD_LABEL = {
  transfer:   'Transferencia',
  cash:       'Efectivo',
  simulation: 'Simulado',
};

function fmt(d) {
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCLP(n) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n ?? 0);
}

export default function ContributionList({ contributions = [] }) {
  if (contributions.length === 0) {
    return <p className="text-sm text-gray-400">Sin aportes registrados aún.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-medium">Participante</th>
            <th className="text-left py-2 pr-4 font-medium">Monto</th>
            <th className="text-left py-2 pr-4 font-medium">Fecha</th>
            <th className="text-left py-2 font-medium">Método</th>
          </tr>
        </thead>
        <tbody>
          {contributions.map(c => (
            <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 pr-4">
                <p className="font-medium text-gray-800">{c.user?.name ?? '—'}</p>
                <p className="text-xs text-gray-400">{c.user?.email}</p>
              </td>
              <td className="py-2 pr-4 font-medium text-indigo-700">{fmtCLP(c.amount)}</td>
              <td className="py-2 pr-4 text-gray-600">{fmt(c.date)}</td>
              <td className="py-2 text-gray-500">{METHOD_LABEL[c.method] ?? c.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
