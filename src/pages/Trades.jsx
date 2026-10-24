import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import SignInPrompt from '@/components/SignInPrompt';
import StatusBadge from '@/components/StatusBadge';
import Countdown from '@/components/Countdown';
import { TRADE_STATUSES, serviceName } from '@/lib/credit';
import { jalaliDateTime, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';
import useDeadlineWatch from '@/hooks/useDeadlineWatch';

export default function Trades() {
  const { user, profile, isAuthed, isAdmin, signIn } = useCurrentUser();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await base44.entities.Trade.filter({ participant_ids: user.id }, { sort: '-created_date', limit: 50 });
      setTrades(res?.items || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useDeadlineWatch({ user, profile, isAdmin, enabled: !!user });

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  if (!isAuthed) return <SignInPrompt title="معاملات من" description="معامله‌ها، مهلت‌ها و سابقه تغییر وضعیت را پس از ورود می‌بینید." onSignIn={signIn} />;

  const isOpen = (trade) => !['settled', 'cancelled', 'refunded'].includes(trade.status);
  const rows = trades.filter((trade) => (filter === 'open' ? isOpen(trade) : !isOpen(trade)));

  const deadlineFor = (trade) => {
    if (trade.status === 'awaiting_funding') return trade.funding_deadline_at;
    if (['funded', 'awaiting_delivery', 'purchase_in_progress'].includes(trade.status)) return trade.delivery_deadline_at;
    if (trade.status === 'awaiting_confirmation') return trade.confirmation_deadline_at;
    return null;
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">معاملات من</h1>
        <p className="text-[12px] text-muted-foreground">هر معامله با شناسه یکتا، قرارداد و سابقه رویداد کامل ثبت می‌شود.</p>
      </header>

      <div className="flex gap-1.5">
        {[
          { id: 'open', label: 'جاری' },
          { id: 'closed', label: 'پایان‌یافته' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-medium transition ${
              filter === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-xs text-muted-foreground">در حال بارگذاری…</p> : null}

      {!loading && !rows.length ? (
        <EmptyState title="معامله‌ای در این بخش نیست" description="با پذیرش یک سفارش در مارکت‌لیست، معامله ساخته می‌شود." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((trade) => {
            const status = TRADE_STATUSES[trade.status] || TRADE_STATUSES.matched;
            const role = trade.buyer_id === user.id ? 'خریدار' : 'فروشنده';
            return (
              <Link
                key={trade.id}
                to={`/trades/${trade.id}`}
                className="space-y-2 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{serviceName(trade.service)}</p>
                    <p className="text-[10px] text-muted-foreground">{trade.trade_code} · نقش شما: {role}</p>
                  </div>
                  <StatusBadge label={status.label} tone={status.tone} />
                </div>
                <p className="text-[12px] text-foreground">
                  {toman(trade.credit_amount)} اعتبار · {toman(trade.price)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <Countdown deadline={deadlineFor(trade)} label="مهلت مرحله" />
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    جزئیات
                    <ArrowLeft className="h-3 w-3" />
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{jalaliDateTime(trade.created_date)}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}