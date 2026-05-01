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
    setLoading(true);
    const params = { sort: filters.sort };
    if (filters.search) params.q = filters.search;
    if (filters.status) params.status = filters.status;

    getFunds(params)
      .then(r => setFunds(r.data))
      .catch(() => setError('Error al cargar fondos'))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mis Fondos</h1>
          <p className="text-sm text-gray-400 mt-0.5">Fondos donde eres organizador o participante</p>
        </div>
        <Link
          to="/fondos/crear"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo fondo
        </Link>
      </div>

      <FundFilters value={filters} onChange={setFilters} />

      {loading && <p className="text-sm text-gray-400">Cargando…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && funds.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No tienes fondos aún</p>
          <p className="text-sm mt-1">Crea uno nuevo o únete a uno existente desde el directorio</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {funds.map(f => <FundCard key={f._id} fund={f} />)}
      </div>
    </div>
  );
}
