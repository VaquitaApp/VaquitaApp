import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getFund, updateFund } from '../api/funds';
import FundForm from '../components/funds/FundForm';

const LOCKED_FIELDS = ['targetAmount', 'deadline', 'recipientAccount', 'frequency', 'quotaAmount'];

export default function EditFundPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fund, setFund] = useState(null);
  const [loadingFund, setLoadingFund] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getFund(id)
      .then(r => setFund(r.data))
      .catch(() => setError('Fondo no encontrado'))
      .finally(() => setLoadingFund(false));
  }, [id]);

  async function handleSubmit(data) {
    setSaving(true);
    setError('');
    try {
      await updateFund(id, data);
      navigate(`/fondos/${id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar');
      setSaving(false);
    }
  }

  if (loadingFund) return <p className="text-sm text-gray-400">Cargando…</p>;
  if (!fund) return <p className="text-sm text-red-500">{error || 'Fondo no encontrado'}</p>;

  const locked = (fund.collectedAmount ?? 0) > 0 ? LOCKED_FIELDS : [];

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link to={`/fondos/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Volver al fondo</Link>
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Editar fondo</h1>
      {(fund.collectedAmount ?? 0) > 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          Algunos campos están bloqueados porque ya existen aportes registrados.
        </p>
      )}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      <FundForm initial={fund} lockedFields={locked} onSubmit={handleSubmit} loading={saving} />
    </div>
  );
}
