import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getFund, updateFund } from '../api/funds';
import FundForm from '../components/funds/FundForm';

const LOCKED_FIELDS = ['targetAmount', 'deadline', 'recipientAccount', 'frequency', 'quotaAmount', 'type', 'expectedParticipants'];

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
    const payload = { ...data };
    for (const f of locked) delete payload[f];

    const hasChanges = Object.keys(payload).some(key => {
      const oldVal = fund[key];
      const newVal = payload[key];
      if (typeof newVal === 'object' && newVal !== null) {
        return JSON.stringify(newVal) !== JSON.stringify(oldVal);
      }
      return String(newVal ?? '') !== String(oldVal ?? '');
    });

    if (!hasChanges) {
      navigate(`/fondos/${id}`);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateFund(id, payload);
      navigate(`/fondos/${id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar');
      setSaving(false);
    }
  }

  if (loadingFund) return <p className="text-sm text-[var(--vaq-muted)]">Cargando…</p>;
  if (!fund) return <p className="text-sm text-[var(--vaq-danger)]">{error || 'Fondo no encontrado'}</p>;

  const locked = (fund.collectedAmount ?? 0) > 0 ? LOCKED_FIELDS : [];

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link to={`/fondos/${id}`} className="text-sm text-[var(--vaq-muted)] transition-colors hover:text-[var(--vaq-ink)]">
          ← Volver al fondo
        </Link>
      </div>
      <h1 className="mb-2 text-xl font-bold text-[var(--vaq-ink)]">Editar fondo</h1>
      {(fund.collectedAmount ?? 0) > 0 && (
        <p className="mb-4 rounded-lg border border-[var(--vaq-tone-warning-text)]/25 bg-[var(--vaq-tone-warning-bg)] px-3 py-2 text-xs text-[var(--vaq-tone-warning-text)]">
          Algunos campos están bloqueados porque ya existen aportes registrados.
        </p>
      )}
      {error && <p className="mb-4 text-sm text-[var(--vaq-danger)]">{error}</p>}
      <FundForm initial={fund} lockedFields={locked} onSubmit={handleSubmit} loading={saving} submitLabel="Guardar cambios" />
    </div>
  );
}
