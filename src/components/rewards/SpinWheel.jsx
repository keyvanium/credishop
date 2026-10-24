import { useState } from 'react';
import { Loader2, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WHEEL_PRIZES } from '@/lib/gamify';

const SIZE = 240;
const C = SIZE / 2;
const R = SIZE / 2 - 6;
const STEP = 360 / WHEEL_PRIZES.length;

const polar = (angle, radius) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return [C + radius * Math.cos(rad), C + radius * Math.sin(rad)];
};

const sectorPath = (start, end) => {
  const [x1, y1] = polar(start, R);
  const [x2, y2] = polar(end, R);
  return `M ${C} ${C} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
};

export default function SpinWheel({ done, onSpin, balance }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

  const spin = () => {
    if (spinning) return;
    const index = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const stop = 360 - (index * STEP + STEP / 2);
    const delta = ((stop - (rotation % 360)) + 360) % 360;
    setSpinning(true);
    setResult(null);
    setRotation(rotation + 360 * 5 + delta);
    setTimeout(async () => {
      const prize = WHEEL_PRIZES[index];
      setResult(prize);
      setSpinning(false);
      await onSpin?.(prize);
    }, 4200);
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-indigo-500/10 via-card to-amber-400/10 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-amber-500" />
            گردونه شانس روزانه
          </p>
          <p className="text-[11px] text-muted-foreground">هر روز یک بار — امتیازها به پاداش نقدی تبدیل می‌شوند</p>
        </div>
        <span className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
          {balance} امتیاز
        </span>
      </header>

      <div className="relative mx-auto w-[240px]">
        <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2">
          <div className="h-0 w-0 border-x-[7px] border-t-[14px] border-x-transparent border-t-rose-500 drop-shadow" />
        </div>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-[240px] w-[240px] drop-shadow-md"
          style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 4s cubic-bezier(0.15, 0.9, 0.2, 1)' }}
        >
          {WHEEL_PRIZES.map((prize, i) => {
            const start = i * STEP;
            const mid = start + STEP / 2;
            return (
              <g key={prize.id}>
                <path d={sectorPath(start, start + STEP)} fill={prize.color} stroke="#fff" strokeWidth="1.5" />
                <g transform={`rotate(${mid} ${C} ${C})`}>
                  <text x={C} y={40} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">
                    {prize.label}
                  </text>
                </g>
              </g>
            );
          })}
          <circle cx={C} cy={C} r="20" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
          <text x={C} y={C + 5} textAnchor="middle" fontSize="14">
            🎁
          </text>
        </svg>
      </div>

      <div className="mt-3 space-y-2">
        {result ? (
          <p className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-[12px] font-semibold text-emerald-200">
            <Trophy className="h-4 w-4" />
            {result.points} امتیاز به کیف جایزه شما اضافه شد
          </p>
        ) : null}
        <Button className="w-full gap-1.5" onClick={spin} disabled={spinning || done}>
          {spinning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {done ? 'امروز شانس خود را آزموده‌اید' : 'چرخاندن گردونه'}
        </Button>
      </div>
    </section>
  );
}