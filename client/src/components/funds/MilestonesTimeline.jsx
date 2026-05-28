import { fmtCLP } from '../../utils/format';

export default function MilestonesTimeline({ milestones = [], currentAmount = 0 }) {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div className="mt-6 mb-2">
      <h3 className="text-sm font-semibold text-[var(--vaq-ink)] mb-3">Hitos del Fondo</h3>
      <div className="space-y-3">
        {milestones.map((m, idx) => {
          const isReached = currentAmount >= m.amount;
          return (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${isReached ? 'bg-[var(--vaq-tone-success-bg)] border-[var(--vaq-tone-success-text)]/30' : 'bg-[var(--vaq-well-bg)] border-[var(--vaq-card-border)]'}`}>
              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isReached ? 'bg-[var(--vaq-forest)] text-white' : 'bg-[var(--vaq-card-border)] text-[var(--vaq-muted)]'}`}>
                {isReached ? '✓' : (idx + 1)}
              </div>
              <div>
                <p className={`text-sm font-medium ${isReached ? 'text-[var(--vaq-forest)]' : 'text-[var(--vaq-ink)]'}`}>
                  {m.description}
                </p>
                <p className="text-xs text-[var(--vaq-muted)] mt-0.5">
                  Meta: {fmtCLP(m.amount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
