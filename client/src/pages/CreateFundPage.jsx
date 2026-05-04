import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createFund } from '../api/funds';
import FundForm from '../components/funds/FundForm';

export default function CreateFundPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(data) {
    setLoading(true);
    setError('');
    try {
      const res = await createFund(data);
      navigate(`/fondos/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al crear el fondo');
      setLoading(false);
    }
  }

  return (
    <div className="-mx-4 min-h-screen bg-[var(--vaq-bg-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-[var(--vaq-forest)]/8 via-transparent to-[var(--vaq-amber)]/10 dark:from-[var(--vaq-forest)]/15 dark:to-[var(--vaq-amber)]/8" />
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/fondos"
            className="vaq-link flex items-center text-sm font-medium transition-opacity hover:opacity-90"
          >
            <span className="mr-2">←</span> Volver a mis fondos
          </Link>
        </div>
        <div className="mb-8 text-center">
          <h1
            className="mb-2 text-3xl font-extrabold tracking-tight text-[var(--vaq-forest)]"
            style={{ fontFamily: 'var(--font-nav-display)' }}
          >
            Comienza una nueva colecta
          </h1>
          <p className="text-[var(--vaq-muted)]">
            Configura los detalles de tu fondo y empieza a reunir dinero de manera fácil y segura.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-r-md border-l-4 border-[var(--vaq-danger)] bg-[var(--vaq-danger-soft)] p-4">
            <p className="text-sm text-[var(--vaq-danger)]">{error}</p>
          </div>
        )}

        <div className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 rounded-[3rem] bg-gradient-to-r from-[var(--vaq-forest)]/15 to-[var(--vaq-amber)]/15 opacity-40 blur-[60px] dark:opacity-25" />
          <FundForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}
