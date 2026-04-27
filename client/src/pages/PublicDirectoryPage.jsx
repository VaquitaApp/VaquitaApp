import { useState, useEffect } from 'react';
import { getPublicFunds } from '../api/funds';
import FundCard from '../components/funds/FundCard';

export default function PublicDirectoryPage() {
  const [funds, setFunds] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('deadline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (search) params.q = search;
    getPublicFunds(params)
      .then(r => setFunds(r.data))
      .catch(() => setError('Error al cargar el directorio'))
      .finally(() => setLoading(false));
  }, [search, sort]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Directorio público</h1>
        <p className="text-sm text-gray-400 mt-0.5">Fondos activos abiertos a nuevos participantes</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar fondos…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-48"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="deadline">Cierre próximo</option>
          <option value="deadline_desc">Cierre lejano</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && funds.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No hay fondos públicos disponibles</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {funds.map(f => <FundCard key={f._id} fund={f} />)}
      </div>
    </div>
  );
}
