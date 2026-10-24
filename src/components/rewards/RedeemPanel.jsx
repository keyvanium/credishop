import { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MIN_REDEEM_POINTS, TOMAN_PER_POINT, pointsToToman } from '@/lib/gamify';
import { parseAmount, toman } from '@/lib/format';

export default function RedeemPanel({ balance, onRedeem, busy }) {
  const [value, setValue] = useState('');
  const points = Math.min(parseAmount(value), balance);
  const amount = pointsToToman(points);

  return (
    <section className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-amber-300/10 p-4">
      <header className="mb-3">
        <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
          <Wallet className="h-4 w-4 text-primary" />
          تبدیل امتیاز به پاداش نقدی
        </p>
        <p className="text-[11px] leading-5 text-muted-foreground">
          هر امتیاز {TOMAN_PER_POINT} تومان · حداقل {MIN_REDEEM_POINTS} امتیاز · موجودی شما {balance} امتیاز
        </p>
      </header>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label className="text-[11px]">امتیاز قابل تبدیل</Label>
          <Input
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={String(MIN_REDEEM_POINTS)}
          />
        </div>
        <Button
          disabled={points < MIN_REDEEM_POINTS || busy}
          onClick={() => onRedeem(points)}
          className="gap-1.5"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          تبدیل
        </Button>
      </div>

      <p className="mt-2 rounded-xl bg-card/70 px-3 py-2 text-[11px] text-foreground">
        معادل ریالی: <span className="font-semibold">{amount > 0 ? toman(amount) : '—'}</span>
      </p>
    </section>
  );
}