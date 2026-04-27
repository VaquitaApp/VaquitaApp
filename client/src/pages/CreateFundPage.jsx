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
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link to="/fondos" className="text-gray-400 hover:text-gray-600 text-sm">← Mis fondos</Link>
      </div>
      <h1 className="text-xl font-bold text-gray-800 mb-5">Crear nuevo fondo</h1>
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      <FundForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
