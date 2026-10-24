import { useState } from 'react';
import { Loader2, ShieldAlert, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyTradeAction, ACTIONS_BY_ROLE, recordBuyerCharge, recordSellerPayout, roleOf } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { toman } from '@/lib/format';

const DANGER = ['open_dispute', 'admin_refund', 'admin_cancel', 'cancel_trade'];

export default function TradeActionPanel({ trade, user, profile, settings, onDone }) {
  const [note, setNote] = useState('');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const role = roleOf(trade, user?.id);
  const actions = ACTIONS_BY_ROLE(trade, user);
  const needsPayment = actions.some((action) => action.id === 'declare_payment');

  const run = async (action) => {
    setError('');
    setBusy(action);
    try {
      if (action === 'record_ledger') {
        if (role === 'buyer') await recordBuyerCharge(trade, user, profile);
        else await recordSellerPayout(trade, user, profile);
      } else {
        await applyTradeAction({
          trade,
          action,
          user,
          profile,
          note,
          extra: {
            funding_reference: txHash,
            allow_without_evidence: Number(trade.evidence_count || 0) > 0
          }
        });
      }
      setNote('');
      setTxHash('');
      await onDone?.();
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const needsLedger = trade.status === 'settled' && role
    && !(role === 'buyer' ? ['buyer_posted', 'complete'] : ['seller_posted', 'complete']).includes(trade.ledger_state);

  if (!user?.id) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="font-heading text-sm font-semibold text-foreground">اقدام‌های مجاز شما</p>

      {needsPayment ? (
        <div className="space-y-2 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-sky-200">
            <Wallet className="h-4 w-4" />
            پرداخت با شبکه TON
          </p>
          <p className="text-[11px] leading-5 text-sky-200">
            مبلغ قابل پرداخت: <span className="font-semibold">{toman(trade.buyer_pays)}</span>
          </p>
          {settings?.ton_wallet_address ? (
            <p className="break-all rounded-lg bg-card px-2 py-1.5 text-[10px] leading-5 text-foreground">
              پرداخت را در شبکه TON به این آدرس انجام دهید:{' '}
              <span className="font-mono" dir="ltr">
                {settings.ton_wallet_address}
              </span>
            </p>
          ) : (
            <p className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-[10px] leading-5 text-amber-200">
              آدرس کیف پول تون هنوز توسط مدیر ثبت نشده است؛ تا آن زمان اعلام پرداخت ممکن نیست.
            </p>
          )}
          <Input
            value={txHash}
            onChange={(event) => setTxHash(event.target.value)}
            placeholder="هش تراکنش (TxID) در شبکه TON"
            dir="ltr"
            className="h-9 text-[11px]"
          />
        </div>
      ) : null}

      {trade.escrow_mode === 'disabled' ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-200">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          پرداخت مستقیم بین طرفین روی شبکه TON انجام و با هش تراکنش مستند می‌شود؛ تسویه مالی فروشنده پس از تأیید خریدار آزاد
          می‌گردد.
        </p>
      ) : null}

      {needsLedger ? (
        <Button size="sm" className="w-full" disabled={!!busy} onClick={() => run('record_ledger')}>
          {busy === 'record_ledger' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ثبت طلب مالی من در دفترکل
        </Button>
      ) : null}

      {actions.length ? (
        <div className="space-y-2">
          {DANGER.some((id) => actions.find((a) => a.id === id)) ? (
            <Textarea
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="توضیح یا دلیل (برای اختلاف و بازپرداخت الزامی است)"
            />
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={DANGER.includes(action.id) ? 'outline' : 'default'}
                className={DANGER.includes(action.id) ? 'border-rose-400/20 text-rose-300 hover:bg-rose-500/10' : ''}
                disabled={!!busy}
                onClick={() => run(action.id)}
              >
                {busy === action.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {action.label}
              </Button>
            ))}
          </div>
          {actions.some((a) => a.requiresEvidence) ? (
            <p className="text-[11px] text-muted-foreground">
              برای «اعلام پرداخت» و «اعلام اتمام خرید» دست‌کم یک مستند باید در بخش شواهد ثبت شده باشد.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
          در وضعیت فعلی اقدام مجازی برای شما وجود ندارد. تغییر وضعیت فقط از طریق عملیات مجاز طرفین یا مدیر انجام می‌شود.
        </p>
      )}

      {trade.payout_status === 'pending' ? (
        <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
          رکورد مالی ثبت شده و در وضعیت «در انتظار تسویه» است. آزادسازی وجه روی شبکه TON
          {settings?.ton_enabled ? ' توسط مدیر انجام می‌شود.' : ' هنوز فعال نشده است.'}
        </p>
      ) : null}

      {error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs leading-5 text-rose-300">{error}</p> : null}
    </div>
  );
}