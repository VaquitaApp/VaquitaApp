import { fmtCLP } from '../../utils/format';

export default function ProgressBar({ value, max }) {
  const actualPct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barWidth = Math.min(100, actualPct);
  const isOver = actualPct > 100;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{fmtCLP(value)}</span>
        <span className={isOver ? "font-bold text-green-600" : ""}>{actualPct}% de {fmtCLP(max)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 relative overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${isOver ? 'bg-green-500' : 'bg-indigo-500'}`}
          style={{ width: `${barWidth}%` }}
        />
        {isOver && (
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        )}
      </div>
    </div>
  );
}
