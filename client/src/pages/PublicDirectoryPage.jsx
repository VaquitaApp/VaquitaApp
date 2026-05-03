import { useState, useEffect } from 'react';
import { getPublicFunds } from '../api/funds';
import FundCard from '../components/funds/FundCard';

const SEARCH_DEBOUNCE_MS = 350;

export default function PublicDirectoryPage() {
  const [funds, setFunds] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('deadline');
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === '') {
      setDebouncedSearch('');
      return undefined;
    }
    const t = setTimeout(() => setDebouncedSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    const params = { sort, status: statusFilter };
    if (debouncedSearch) params.q = debouncedSearch;
    if (typeFilter) params.type = typeFilter;

    getPublicFunds(params)
      .then(r => {
        if (!ignore) setFunds(r.data);
      })
      .catch(() => {
        if (!ignore) {
          setFunds([]);
          setError('No se pudo cargar el directorio. Intenta de nuevo en unos segundos.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, sort, statusFilter, typeFilter]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Directorio público</h1>
        <p className="text-sm text-gray-400 mt-0.5">Fondos públicos a los que aún no perteneces</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="search"
          placeholder="Buscar fondos por nombre…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          aria-label="Buscar fondos por nombre"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-48"
        />
        <label className="sr-only" htmlFor="dir-sort">Ordenar por fecha de cierre</label>
        <select
          id="dir-sort"
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="deadline">Cierre próximo</option>
          <option value="deadline_desc">Cierre lejano</option>
        </select>
        <label className="sr-only" htmlFor="dir-status">Estado del fondo</label>
        <select
          id="dir-status"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="active">Activos</option>
          <option value="paused">En pausa</option>
        </select>
        <label className="sr-only" htmlFor="dir-type">Tipo de fondo</label>
        <select
          id="dir-type"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todos los tipos</option>
          <option value="quota">Solo cuotas</option>
          <option value="free">Solo libre</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}
      {error && (
        <p className="text-sm text-red-600 mb-4" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && funds.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No hay fondos públicos disponibles</p>
          <p className="text-sm mt-1">
            No encontramos fondos con estos filtros, o ya participas en los públicos activos.
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map(f => (
            <FundCard key={f._id} fund={f} />
          ))}
        </div>
      )}
    </div>
  );
}
