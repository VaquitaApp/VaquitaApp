import { useState, useEffect } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/health`)
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setError('No se pudo conectar con el servidor'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-indigo-600 mb-1">VaquitaApp</h1>
        <p className="text-gray-400 text-sm mb-8">Fondos colectivos digitales</p>

        <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 text-sm font-mono text-left space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Estado del sistema</p>

          {!health && !error && (
            <p className="text-gray-400">Conectando con el servidor…</p>
          )}

          {error && (
            <p className="text-red-500">{error}</p>
          )}

          {health && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">api</span>
                <span className={health.ok ? 'text-green-500' : 'text-red-500'}>
                  {health.ok ? '✓ ok' : '✗ error'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">base de datos</span>
                <span className={health.db === 'connected' ? 'text-green-500' : 'text-red-500'}>
                  {health.db}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">timestamp</span>
                <span className="text-gray-600">
                  {new Date(health.timestamp).toLocaleTimeString('es-CL')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
