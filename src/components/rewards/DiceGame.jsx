import { useState } from 'react';
import { Dices, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DICE_POINTS } from '@/lib/gamify';

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
};

export default function DiceGame({ done, onRoll }) {
  const [face, setFace] = useState(6);
  const [rolling, setRolling] = useState(false);
  const [gained, setGained] = useState(null);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setGained(null);
    let ticks = 0;
    const timer = setInterval(() => {
      setFace(1 + Math.floor(Math.random() * 6));
      ticks += 1;
      if (ticks > 10) {
        clearInterval(timer);
        const final = 1 + Math.floor(Math.random() * 6);
        setFace(final);
        setRolling(false);
        setGained(DICE_POINTS[final]);
        onRoll?.(final, DICE_POINTS[final]);
      }
    }, 110);
  };

  return (
    <section className="rounded-3xl border border-border bg-gradient-to-br from-emerald-500/10 via-card to-sky-500/10 p-4">
      <header className="mb-3">
        <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
          <Dices className="h-4 w-4 text-emerald-600" />
          تاس روزانه
        </p>
        <p className="text-[11px] text-muted-foreground">هر روز یک پرتاب — شانس بیشتر با عدد بالاتر</p>
      </header>

      <div className="flex items-center justify-center py-2">
        <div
          className={`grid h-20 w-20 grid-cols-3 grid-rows-3 gap-1 rounded-2xl border border-border bg-card p-2 shadow-sm ${
            rolling ? 'animate-pulse' : ''
          }`}
        >
          {Array.from({ length: 9 }).map((_, cell) => (
            <span
              key={cell}
              className={`rounded-full ${PIPS[face].includes(cell) ? 'bg-foreground' : 'bg-transparent'}`}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {gained ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-[12px] font-semibold text-emerald-800">
            {gained} امتیاز گرفتید
          </p>
        ) : null}
        <Button variant="outline" className="w-full gap-1.5" onClick={roll} disabled={rolling || done}>
          {rolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
          {done ? 'امروز پرتاب کرده‌اید' : 'پرتاب تاس'}
        </Button>
      </div>
    </section>
  );
}