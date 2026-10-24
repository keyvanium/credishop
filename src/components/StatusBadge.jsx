import { TONE_CLASSES, TONE_DOTS } from '@/lib/credit';

export default function StatusBadge({ label, tone = 'muted', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none ${TONE_CLASSES[tone] || TONE_CLASSES.muted} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOTS[tone] || TONE_DOTS.muted}`} />
      {label}
    </span>
  );
}
