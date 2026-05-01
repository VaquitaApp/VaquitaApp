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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 -mt-8 mx-[-1rem]">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/fondos" className="text-indigo-500 hover:text-indigo-700 font-medium text-sm transition-colors flex items-center">
            <span className="mr-2">←</span> Volver a mis fondos
          </Link>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            Comienza una nueva colecta
          </h1>
          <p className="text-gray-500">Configura los detalles de tu fondo y empieza a reunir dinero de manera fácil y segura.</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-300 to-purple-300 blur-[60px] opacity-20 -z-10 rounded-[3rem]"></div>
          <FundForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  );
}
