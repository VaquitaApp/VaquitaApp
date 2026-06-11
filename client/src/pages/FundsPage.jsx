import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFunds } from '../api/funds';
import { useAuth } from '../contexts/AuthContext';
import FundCard from '../components/funds/FundCard';
import FundFilters from '../components/funds/FundFilters';

const INITIAL_FILTERS = { search: '', status: '', sort: 'deadline', role: 'all', type: '' };

export default function FundsPage() {
  const { user } = useAuth();
  const [funds, setFunds] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
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
  }, [filters.search, filters.status, filters.sort]);

  const userId = user?._id;
  const displayFunds = funds.filter((f) => {
    const isMine = String(f.organizer?._id) === String(userId);
    if (filters.role === 'mine' && !isMine) return false;
    if (filters.role === 'invited' && isMine) return false;
    if (filters.type && f.type !== filters.type) return false;
    return true;
  });

  const isFiltered =
    filters.search !== INITIAL_FILTERS.search ||
    filters.status !== INITIAL_FILTERS.status ||
    filters.sort !== INITIAL_FILTERS.sort ||
    filters.role !== INITIAL_FILTERS.role ||
    filters.type !== INITIAL_FILTERS.type;

  const showEmpty = !loading && !error && displayFunds.length === 0;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--vaq-ink)]">Mis Fondos</h1>
          <p className="mt-0.5 text-sm text-[var(--vaq-muted)]">Fondos donde eres organizador o participante</p>
        </div>
        <Link to="/fondos/crear" data-testid="btn-nuevo-fondo" className="vaq-btn-primary rounded-lg px-4 py-2 text-sm">
          + Nuevo fondo
        </Link>
      </div>

      <FundFilters
        value={filters}
        onChange={setFilters}
        showRole
        canClear={isFiltered}
        onClear={() => setFilters(INITIAL_FILTERS)}
      />

      {loading && <p className="text-sm text-[var(--vaq-muted)]">Cargando…</p>}
      {error && <p className="text-sm text-[var(--vaq-danger)]">{error}</p>}

      {showEmpty && !isFiltered && (
        <div className="py-16 text-center text-[var(--vaq-muted)]">
          <p className="text-lg">No tienes fondos aún</p>
          <p className="mt-1 text-sm">Crea uno nuevo o únete a uno existente desde el directorio público</p>
        </div>
      )}

      {showEmpty && isFiltered && (
        <div className="py-16 text-center text-[var(--vaq-muted)]">
          <p className="text-lg">Ningún fondo coincide con los filtros</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayFunds.map((f) => {
          const role = String(f.organizer?._id) === String(userId) ? 'mine' : 'invited';
          return <FundCard key={f._id} fund={f} role={role} />;
        })}
      </div>
    </div>
  );
}
