const filterClass =
  'min-h-[2.25rem] flex-1 min-w-48 rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-1.5 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

const filterSelectClass =
  'min-h-[2.25rem] rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] px-3 py-1.5 text-sm text-[var(--vaq-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--vaq-ring)]';

const ROLES = [
  { value: 'all', label: 'Todos' },
  { value: 'mine', label: 'Creados por mí' },
  { value: 'invited', label: 'Invitado' },
];

export default function FundFilters({ value, onChange, showRole = false, canClear = false, onClear }) {
  function set(key, val) {
    onChange({ ...value, [key]: val });
  }

  return (
    <div className="mb-5 flex flex-col gap-3">
      {showRole && (
        <div className="inline-flex w-fit rounded-lg border border-[var(--vaq-input-border)] bg-[var(--vaq-input-bg)] p-0.5">
          {ROLES.map((r) => {
            const active = (value.role ?? 'all') === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => set('role', r.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--vaq-badge-bg)] text-[var(--vaq-badge-fg)]'
                    : 'text-[var(--vaq-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
                aria-pressed={active}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
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
        <select value={value.type ?? ''} onChange={(e) => set('type', e.target.value)} className={filterSelectClass}>
          <option value="">Todos los tipos</option>
          <option value="quota">Por cuotas</option>
          <option value="free">Libre</option>
        </select>
        <select value={value.sort} onChange={(e) => set('sort', e.target.value)} className={filterSelectClass}>
          <option value="deadline">Cierre próximo</option>
          <option value="deadline_desc">Cierre lejano</option>
          <option value="name">Nombre A-Z</option>
        </select>
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto self-center text-sm font-semibold text-[var(--vaq-forest)] underline-offset-2 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
