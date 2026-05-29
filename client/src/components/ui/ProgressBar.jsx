import { fmtCLP } from '../../utils/format';

export default function ProgressBar({ value, max, milestones = [] }) {
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
      <div className="relative h-3 w-full rounded-full bg-[var(--vaq-progress-track)]">
        <div
          className={`absolute top-0 bottom-0 left-0 rounded-full transition-all ${isOver ? 'bg-[var(--vaq-progress-overfill)]' : 'bg-[var(--vaq-progress-fill)]'}`}
          style={{ width: `${barWidth}%` }}
        />
        {milestones.map((m, idx) => {
          const pinPct = Math.min(100, Math.max(0, (m.amount / max) * 100));
          const isReached = value >= m.amount;
          return (
            <div
              key={idx}
              className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-sm ${isReached ? 'bg-[var(--vaq-forest)]' : 'bg-[var(--vaq-card-border)]'}`}
              style={{ left: `${pinPct}%`, transform: 'translate(-50%, -50%)' }}
              title={`${m.description} (${fmtCLP(m.amount)})`}
            />
          );
        })}
        {isOver && <div className="absolute inset-0 animate-pulse bg-[var(--vaq-card)]/25 rounded-full" />}
      </div>
    </div>
  );
}
