import { useEffect, useState } from 'react';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { adminActivatePromotion, adminApproveSubscription, adminGrantReferralReward, loadSettings } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { jalaliDate, num, toman } from '@/lib/format';

export default function RevenueTab({ user }) {
  const [state, setState] = useState({ subscriptions: [], promotions: [], referrals: [], points: 50 });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const settings = await loadSettings();
    const [subs, promos, referrals] = await Promise.all([
      base44.entities.Subscription.list('-created_date', 50),
      base44.entities.OrderPromotion.list('-created_date', 50),
      base44.entities.Referral.list('-created_date', 50)
    ]);
    const norm = (res) => (Array.isArray(res) ? res : res?.items || []);
    setState({
      subscriptions: norm(subs),
      promotions: norm(promos),
      referrals: norm(referrals),
      points: Number(settings.referral_reward_points || 50)
    });
  };

  useEffect(() => {
    load().catch(() => setError('بارگذاری درخواست‌ها ممکن نشد.'));
  }, []);

  const run = async (key, action) => {
    setError('');
    setMessage('');
    setBusy(key);
    try {
      await action();
      await load();
      setMessage('انجام شد.');
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const Section = ({ title, children, empty }) => (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
      {empty ? <p className="text-xs text-muted-foreground">درخواستی ثبت نشده است.</p> : children}
    </div>
  );

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p> : null}

      <Section title="درخواست‌های اشتراک حرفه‌ای" empty={!state.subscriptions.length}>
        {state.subscriptions.map((sub) => (
          <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
            <div>
              <p className="text-[12px] font-medium text-foreground">{sub.user_name || sub.user_id}</p>
              <p className="text-[11px] text-muted-foreground">
                {sub.plan === 'pro_yearly' ? 'سالانه' : 'ماهانه'} · {toman(sub.price)} · {jalaliDate(sub.created_date)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge
                label={{ requested: 'درخواست', pending_payment: 'در انتظار پرداخت', active: 'فعال', cancelled: 'لغو', expired: 'منقضی' }[sub.status] || sub.status}
                tone={sub.status === 'active' ? 'success' : sub.status === 'cancelled' ? 'muted' : 'warning'}
              />
              {sub.status !== 'active' ? (
                <Button size="sm" className="h-8 text-[11px]" disabled={!!busy} onClick={() => run(sub.id, () => adminApproveSubscription({ user, subscription: sub, status: 'active', plan: sub.plan }))}>
                  {busy === sub.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  فعال‌سازی
                </Button>
              ) : null}
              {sub.status === 'requested' ? (
                <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={!!busy} onClick={() => run(sub.id, () => adminApproveSubscription({ user, subscription: sub, status: 'cancelled', plan: sub.plan }))}>
                  رد
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        <p className="text-[10px] leading-5 text-muted-foreground">
          فعال‌سازی اشتراک، سطح کاربر را به «حرفه‌ای» ارتقا می‌دهد. دریافت وجه اشتراک تا اتصال درگاه پرداخت انجام نمی‌شود.
        </p>
      </Section>

      <Section title="درخواست‌های آگهی ویژه" empty={!state.promotions.length}>
        {state.promotions.map((promo) => (
          <div key={promo.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
            <div>
              <p className="text-[12px] font-medium text-foreground">{promo.order_code}</p>
              <p className="text-[11px] text-muted-foreground">{promo.user_name} · {toman(promo.price)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge label={promo.status === 'active' ? 'فعال' : promo.status === 'cancelled' ? 'لغو' : 'درخواست'} tone={promo.status === 'active' ? 'success' : 'warning'} />
              {promo.status !== 'active' ? (
                <Button size="sm" className="h-8 text-[11px]" disabled={!!busy} onClick={() => run(promo.id, () => adminActivatePromotion({ user, promotion: promo, status: 'active', days: 7 }))}>
                  فعال‌سازی ۷ روزه
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-8 text-[11px]" disabled={!!busy} onClick={() => run(promo.id, () => adminActivatePromotion({ user, promotion: promo, status: 'cancelled' }))}>
                  پایان
                </Button>
              )}
            </div>
          </div>
        ))}
      </Section>

      <Section title="ارجاع کاربران" empty={!state.referrals.length}>
        {state.referrals.map((ref) => (
          <div key={ref.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
            <div>
              <p className="text-[12px] font-medium text-foreground">{ref.referrer_name || ref.referrer_id}</p>
              <p className="text-[11px] text-muted-foreground">کد {ref.code} · معرفی‌شده: {ref.invitee_name || '—'} · {jalaliDate(ref.created_date)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge label={ref.status === 'rewarded' ? 'پاداش داده شد' : ref.status === 'joined' ? 'عضو شده' : ref.status} tone={ref.status === 'rewarded' ? 'success' : 'warning'} />
              {ref.status !== 'rewarded' ? (
                <Button
                  size="sm"
                  className="h-8 text-[11px]"
                  disabled={!!busy}
                  onClick={() => run(ref.id, () => adminGrantReferralReward({ user, referral: ref, points: state.points, amount: 0 }))}
                >
                  ثبت پاداش {num(state.points)} امتیاز
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}