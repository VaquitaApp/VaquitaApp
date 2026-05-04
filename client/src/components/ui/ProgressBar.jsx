import { fmtCLP } from '../../utils/format';

export default function ProgressBar({ value, max }) {
  const actualPct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barWidth = Math.min(100, actualPct);
  const isOver = actualPct > 100;

  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-xs text-[var(--vaq-muted)]">
        <span>{fmtCLP(value)}</span>
        <span className={isOver ? 'font-bold text-[var(--vaq-progress-overfill)]' : ''}>
          {actualPct}% de {fmtCLP(max)}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--vaq-progress-track)]">
        <div
          className={`h-2 rounded-full transition-all ${isOver ? 'bg-[var(--vaq-progress-overfill)]' : 'bg-[var(--vaq-progress-fill)]'}`}
          style={{ width: `${barWidth}%` }}
        />
        {isOver && <div className="absolute inset-0 animate-pulse bg-[var(--vaq-card)]/25" />}
      </div>
    </div>
  );
}
