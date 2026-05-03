import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFunds } from '../api/funds';
import FundCard from '../components/funds/FundCard';
import FundFilters from '../components/funds/FundFilters';

export default function FundsPage() {
  const [funds, setFunds] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', sort: 'deadline' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- estado de carga acoplado al ciclo de fetch
    setLoading(true);
    const params = { sort: filters.sort };
    if (filters.search) params.q = filters.search;
    if (filters.status) params.status = filters.status;

    getFunds(params)
      .then((r) => setFunds(r.data))
      .catch(() => setError('Error al cargar fondos'))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vaq-ink)]">Mis Fondos</h1>
          <p className="mt-0.5 text-sm text-[var(--vaq-muted)]">Fondos donde eres organizador o participante</p>
        </div>
        <Link to="/fondos/crear" className="vaq-btn-primary rounded-lg px-4 py-2 text-sm">
          + Nuevo fondo
        </Link>
      </div>

      <FundFilters value={filters} onChange={setFilters} />

      {loading && <p className="text-sm text-[var(--vaq-muted)]">Cargando…</p>}
      {error && <p className="text-sm text-[var(--vaq-danger)]">{error}</p>}

      {!loading && !error && funds.length === 0 && (
        <div className="py-16 text-center text-[var(--vaq-muted)]">
          <p className="text-lg">No tienes fondos aún</p>
          <p className="mt-1 text-sm">Crea uno nuevo o únete a uno existente desde el directorio</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {funds.map((f) => (
          <FundCard key={f._id} fund={f} />
        ))}
      </div>
    </div>
  );
}
