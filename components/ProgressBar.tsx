type ProgressBarProps = {
  current: number;
  total: number;
  /** 1-based question index; called when the user moves the progress slider */
  onSeek?: (nextQuestion: number) => void;
};

export default function ProgressBar({ current, total, onSeek }: ProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const clamped = Math.min(Math.max(current, 1), safeTotal);
  const percent = Math.min(100, Math.round((clamped / safeTotal) * 100));
  const interactive = Boolean(onSeek) && safeTotal > 1;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>Progress</span>
        <span>
          {Math.min(current, total)}/{total}
        </span>
      </div>

      {interactive ? (
        <input
          type="range"
          min={1}
          max={safeTotal}
          value={clamped}
          aria-label="Question progress"
          aria-valuemin={1}
          aria-valuemax={safeTotal}
          aria-valuenow={clamped}
          onChange={(e) => onSeek?.(Number(e.target.value))}
          className="h-3 w-full cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:accent-blue-500"
        />
      ) : (
        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all dark:bg-blue-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}
