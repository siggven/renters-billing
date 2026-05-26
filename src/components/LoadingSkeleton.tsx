/**
 * Lightweight loading skeleton — animated bar of slate boxes. Used across pages
 * to replace plain "Loading…" text with something that conveys structure while
 * the data loads.
 *
 * Pass `rows` for tabular layouts, `lines` for stacked text. `aria-busy` on the
 * outer container makes screen readers announce the loading state once.
 */
interface Props {
  rows?: number;
  /** Optional descriptive label announced to screen readers. */
  label?: string;
  /** Class to apply to each row (e.g. heights). */
  rowClassName?: string;
}

export function LoadingSkeleton({
  rows = 3,
  label = 'Loading…',
  rowClassName = 'h-12',
}: Props) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className="space-y-2 animate-pulse"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={`bg-slate-800/60 rounded ${rowClassName}`} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
