import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { durationText, remainingMs } from '@/lib/format';

export default function Countdown({ deadline, label = 'مهلت' }) {
  const [ms, setMs] = useState(() => remainingMs(deadline));

  useEffect(() => {
    setMs(remainingMs(deadline));
    if (!deadline) return undefined;
    const timer = setInterval(() => setMs(remainingMs(deadline)), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline || ms === null) return null;
  const expired = ms <= 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-medium ${expired ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-border bg-muted/60 text-muted-foreground'}`}
    >
      <Clock className="h-3.5 w-3.5" />
      {expired ? `${label} به پایان رسیده` : `${label}: ${durationText(ms)}`}
    </span>
  );
}