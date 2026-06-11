import { useState, useEffect } from 'react';
import { getPublicFunds } from '../api/funds';
import FundCard from '../components/funds/FundCard';

const SEARCH_DEBOUNCE_MS = 350;

const filterClass =
  'min-h-[2.25rem] flex-1 min-w-48 rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-1.5 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

const filterSelectClass =
  'min-h-[2.25rem] rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-1.5 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

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
      const t0 = setTimeout(() => setDebouncedSearch(''), 0);
      return () => clearTimeout(t0);
    }
    const t = setTimeout(() => setDebouncedSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- estado de carga acoplado al ciclo de fetch
    setLoading(true);
    setError('');
    const params = { sort, status: statusFilter };
    if (debouncedSearch) params.q = debouncedSearch;
    if (typeFilter) params.type = typeFilter;

    getPublicFunds(params)
      .then((r) => {
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

  const isFiltered =
    searchInput !== '' || sort !== 'deadline' || statusFilter !== 'active' || typeFilter !== '';

  function clearFilters() {
    setSearchInput('');
    setSort('deadline');
    setStatusFilter('active');
    setTypeFilter('');
  }

  return (
    <div>
      <div className="mb-5">
        <h1 data-testid="directory-title" className="text-2xl font-bold text-[var(--vaq-ink)]">Directorio público</h1>
        <p className="mt-0.5 text-sm text-[var(--vaq-muted)]">Fondos públicos a los que aún no perteneces</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Buscar fondos por nombre…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Buscar fondos por nombre"
          className={filterClass}
        />
        <label className="sr-only" htmlFor="dir-sort">
          Ordenar por fecha de cierre
        </label>
        <select id="dir-sort" value={sort} onChange={(e) => setSort(e.target.value)} className={filterSelectClass}>
          <option value="deadline">Cierre próximo</option>
          <option value="deadline_desc">Cierre lejano</option>
        </select>
        <label className="sr-only" htmlFor="dir-status">
          Estado del fondo
        </label>
        <select
          id="dir-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="active">Activos</option>
          <option value="paused">En pausa</option>
        </select>
        <label className="sr-only" htmlFor="dir-type">
          Tipo de fondo
        </label>
        <select
          id="dir-type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Todos los tipos</option>
          <option value="quota">Solo cuotas</option>
          <option value="free">Solo libre</option>
        </select>
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto self-center text-sm font-semibold text-[var(--vaq-forest)] underline-offset-2 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-[var(--vaq-muted)]">Cargando…</p>}
      {error && (
        <p className="mb-4 text-sm text-[var(--vaq-danger)]" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && funds.length === 0 && (
        <div className="py-16 text-center text-[var(--vaq-muted)]">
          <p className="text-lg">No hay fondos públicos disponibles</p>
          <p className="mt-1 text-sm">
            No encontramos fondos con estos filtros, o ya participas en los públicos activos.
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funds.map((f) => (
            <FundCard key={f._id} fund={f} />
          ))}
        </div>
      )}
    </div>
  );
}
