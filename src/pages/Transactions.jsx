import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import SignInPrompt from '@/components/SignInPrompt';
import StatusBadge from '@/components/StatusBadge';
import { LEDGER_STATUSES, LEDGER_TYPES } from '@/lib/credit';
import { walletSummary } from '@/lib/engine';
import { jalaliDateTime, num, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';

export default function Transactions() {
  const { user, isAuthed, signIn } = useCurrentUser();
  const [tab, setTab] = useState('ledger');
  const [entries, setEntries] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [ledgerRes, rewardRes, wallet] = await Promise.all([
        base44.entities.LedgerEntry.filter({ user_id: user.id }, { sort: '-created_date', limit: 100 }),
        base44.entities.RewardLedger.filter({ user_id: user.id }, { sort: '-created_date', limit: 100 }),
        walletSummary(user.id)
      ]);
      setEntries(ledgerRes?.items || []);
      setRewards(rewardRes?.items || []);
      setSummary(wallet);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  if (!isAuthed) return <SignInPrompt title="تاریخچه مالی" description="دفترکل و امتیازهای شما پس از ورود نمایش داده می‌شود." onSignIn={signIn} />;

  const points = rewards.reduce((sum, item) => sum + (item.direction === 'credit' ? Number(item.points) : -Number(item.points)), 0);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">تاریخچه معاملات و دفترکل</h1>
        <p className="text-[12px] text-muted-foreground">هر رکورد مالی از یک رویداد واقعی ساخته می‌شود و تغییرناپذیر ثبت می‌گردد.</p>
      </header>

      {summary ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-3.5">
            <p className="text-[10px] text-muted-foreground">موجودی تسویه‌شده</p>
            <p className="mt-1 font-heading text-base font-bold text-foreground">{toman(summary.balance)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5">
            <p className="text-[10px] text-muted-foreground">طلب در انتظار تسویه</p>
            <p className="mt-1 font-heading text-base font-bold text-foreground">{toman(summary.pending_credit)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3.5">
            <p className="text-[10px] text-muted-foreground">بدهی در انتظار تسویه</p>
            <p className="mt-1 font-heading text-base font-bold text-foreground">{toman(summary.pending_debit)}</p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-1.5">
        {[
          { id: 'ledger', label: 'دفترکل' },
          { id: 'rewards', label: `امتیازها (${num(points)})` }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-medium transition ${
              tab === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> در حال بارگذاری…</p> : null}

      {!loading && tab === 'ledger' ? (
        entries.length ? (
          <div className="space-y-2">
            {entries.map((entry) => {
              const status = LEDGER_STATUSES[entry.status] || LEDGER_STATUSES.pending;
              return (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{LEDGER_TYPES[entry.type] || entry.type}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {entry.entry_code} {entry.trade_code ? `· ${entry.trade_code}` : ''} · {jalaliDateTime(entry.created_date)}
                    </p>
                    {entry.note ? <p className="text-[10px] text-muted-foreground">{entry.note}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-semibold ${entry.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {entry.direction === 'credit' ? '+' : '−'} {toman(entry.amount)}
                    </span>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="رکورد مالی ندارید" description="پس از تکمیل معامله، رکوردهای مالی در این بخش ثبت می‌شوند." />
        )
      ) : null}

      {!loading && tab === 'rewards' ? (
        rewards.length ? (
          <div className="space-y-2">
            {rewards.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5">
                <div>
                  <p className="text-[12px] font-medium text-foreground">
                    {reward.kind === 'referral' ? 'پاداش معرفی' : reward.kind === 'loyalty' ? 'امتیاز وفاداری' : 'امتیاز'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{reward.note} · {jalaliDateTime(reward.created_date)}</p>
                </div>
                <span className="text-[12px] font-semibold text-foreground">{num(reward.points)} امتیاز</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="امتیازی ثبت نشده" description="پاداش‌ها پس از تأیید مدیر و بر اساس رویدادهای واقعی ثبت می‌شوند." />
        )
      ) : null}

      <p className="text-[10px] leading-5 text-muted-foreground">
        رکوردهای «در انتظار تسویه» تا اتصال درگاه پرداخت به وجه واقعی تبدیل نمی‌شوند؛ این وضعیت در گزارش‌های مدیریتی نیز جداگانه
        محاسبه می‌شود.
      </p>
    </div>
  );
}