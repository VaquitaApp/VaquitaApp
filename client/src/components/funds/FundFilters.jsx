const filterClass =
  'min-h-[2.25rem] flex-1 min-w-48 rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-1.5 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

const filterSelectClass =
  'min-h-[2.25rem] rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-1.5 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

export default function FundFilters({ value, onChange }) {
  function set(key, val) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="mb-5 flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="Buscar por nombre…"
        value={value.search}
        onChange={(e) => set('search', e.target.value)}
        className={filterClass}
      />
      <select value={value.status} onChange={(e) => set('status', e.target.value)} className={filterSelectClass}>
        <option value="">Todos los estados</option>
        <option value="active">Activo</option>
        <option value="completed">Completado</option>
        <option value="closed">Cerrado</option>
      </select>
      <select value={value.sort} onChange={(e) => set('sort', e.target.value)} className={filterSelectClass}>
        <option value="deadline">Cierre próximo</option>
        <option value="deadline_desc">Cierre lejano</option>
        <option value="name">Nombre A-Z</option>
      </select>
    </div>
  );
}
