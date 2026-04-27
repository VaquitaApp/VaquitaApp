export default function FundFilters({ value, onChange }) {
  function set(key, val) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <input
        type="text"
        placeholder="Buscar por nombre…"
        value={value.search}
        onChange={e => set('search', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-1 min-w-48"
      />
      <select
        value={value.status}
        onChange={e => set('status', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="">Todos los estados</option>
        <option value="active">Activo</option>
        <option value="completed">Completado</option>
        <option value="closed">Cerrado</option>
      </select>
      <select
        value={value.sort}
        onChange={e => set('sort', e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="deadline">Cierre próximo</option>
        <option value="deadline_desc">Cierre lejano</option>
        <option value="name">Nombre A-Z</option>
      </select>
    </div>
  );
}
