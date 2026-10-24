import { TONE_CLASSES } from '@/lib/credit';

export default function StatusBadge({ label, tone = 'muted', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none ${TONE_CLASSES[tone] || TONE_CLASSES.muted} ${className}`}
    >
      {label}
    </span>
  );
}