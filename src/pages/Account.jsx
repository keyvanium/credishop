import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Copy, Loader2, Save, Sparkles, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import SignInPrompt from '@/components/SignInPrompt';
import { TIERS, VERIFICATION_STATUSES } from '@/lib/credit';
import {
  applyReferralCode,
  ratingOf,
  refreshProfileStats,
  requestSubscription,
  requestVerification,
  saveProfile,
  walletSummary
} from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { jalaliDate, num, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePlatformSettings from '@/hooks/usePlatformSettings';

export default function Account() {
  const { user, profile, isAuthed, isAdmin, signIn, refresh } = useCurrentUser();
  const { settings } = usePlatformSettings();
  const [form, setForm] = useState({ full_name: '', display_name: '', phone: '', city: '', bio: '', account_type: 'individual' });
  const [referrals, setReferrals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [refCode, setRefCode] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await refreshProfileStats(user, profile);
      const [refRes, subRes, walletData] = await Promise.all([
        base44.entities.Referral.filter({ referrer_id: user.id }, { sort: '-created_date', limit: 30 }),
        base44.entities.Subscription.filter({ user_id: user.id }, { sort: '-created_date', limit: 10 }),
        walletSummary(user.id)
      ]);
      setReferrals(refRes?.items || []);
      setSubscriptions(subRes?.items || []);
      setWallet(walletData);
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [user, profile, refresh]);

  useEffect(() => {
    load().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name || '',
      display_name: profile.display_name || '',
      phone: profile.phone || '',
      city: profile.city || '',
      bio: profile.bio || '',
      account_type: profile.account_type || 'individual'
    });
  }, [profile]);

  if (!isAuthed) return <SignInPrompt title="حساب کاربری" description="اطلاعات پروفایل، سطح کاربری و کد معرف پس از ورود نمایش داده می‌شود." onSignIn={signIn} />;

  const run = async (key, action, success) => {
    setError('');
    setNotice('');
    setBusy(key);
    try {
      await action();
      await load();
      setNotice(success);
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const verification = VERIFICATION_STATUSES[profile?.verification_status] || VERIFICATION_STATUSES.unverified;
  const tier = TIERS[profile?.tier] || TIERS.bronze;
  const activeSub = subscriptions.find((s) => s.status === 'active');
  const pendingSub = subscriptions.find((s) => s.status === 'requested');

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">حساب کاربری</h1>
        <p className="text-[12px] text-muted-foreground">اطلاعات پروفایل، سطح کاربری، کد معرف و وضعیت اشتراک</p>
      </header>

      {error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{notice}</p> : null}

      <div className="grid gap-2 sm:grid-cols-4">
        <Stat label="معاملات موفق" value={num(profile?.completed_trades)} />
        <Stat label="اختلاف‌ها" value={num(profile?.disputed_trades)} />
        <Stat label="امتیاز" value={ratingOf(profile) ? `${num(ratingOf(profile))} از ۵` : '—'} />
        <Stat label="سطح" value={tier.label} />
      </div>

      {wallet ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
          <div>
            <p className="text-[10px] text-muted-foreground">موجودی تسویه‌شده</p>
            <p className="font-heading text-base font-bold text-foreground">{toman(wallet.balance)}</p>
            <p className="text-[10px] text-muted-foreground">در انتظار تسویه: {toman(wallet.pending_credit)} طلب / {toman(wallet.pending_debit)} بدهی</p>
          </div>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to="/transactions">
              <Wallet className="h-4 w-4" />
              تاریخچه مالی
            </Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="font-heading text-sm font-semibold text-foreground">اطلاعات پروفایل</p>
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label>نام و نام خانوادگی</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>نام نمایشی</Label>
                <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>تلفن</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="۰۹…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>شهر</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>نوع حساب</Label>
                <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                  <option value="individual">شخصی</option>
                  <option value="business">تجاری</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>درباره من</Label>
              <Textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                disabled={busy === 'profile'}
                onClick={() => run('profile', () => saveProfile({ profile, user, values: form }), 'پروفایل ذخیره شد.')}
              >
                {busy === 'profile' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره
              </Button>
              <StatusBadge label={`احراز هویت: ${verification.label}`} tone={verification.tone} />
              {profile?.verification_status !== 'verified' ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === 'verify' || profile?.verification_status === 'pending'}
                  onClick={() => run('verify', () => requestVerification({ user, profile }), 'درخواست احراز هویت ثبت شد و توسط مدیر بررسی می‌شود.')}
                >
                  {profile?.verification_status === 'pending' ? 'در حال بررسی' : 'درخواست احراز هویت'}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="font-heading text-sm font-semibold text-foreground">کد معرف شما</p>
            <div className="flex items-center gap-2">
              <Input value={profile?.referral_code || '—'} readOnly dir="ltr" className="font-mono" />
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => navigator.clipboard?.writeText(profile?.referral_code || '')}
              >
                <Copy className="h-3.5 w-3.5" />
                کپی
              </Button>
            </div>
            {settings.referral_enabled ? (
              <>
                <p className="text-[10px] leading-5 text-muted-foreground">
                  اگر با کد دیگری به پلتفرم معرفی شده‌اید، آن را اینجا ثبت کنید. پاداش پس از تأیید مدیر و بر اساس معاملات واقعی
                  اعطا می‌شود.
                </p>
                <div className="flex gap-2">
                  <Input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="کد معرف" dir="ltr" />
                  <Button
                    size="sm"
                    disabled={busy === 'ref' || !!profile?.referred_by_code}
                    onClick={() => run('ref', () => applyReferralCode({ user, profile, code: refCode }), 'کد معرف ثبت شد.')}
                  >
                    ثبت کد
                  </Button>
                </div>
                {referrals.length ? (
                  <div className="space-y-1 pt-1">
                    {referrals.map((ref) => (
                      <div key={ref.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-2 py-1.5 text-[10px]">
                        <span className="text-foreground">{ref.invitee_name || ref.invitee_id}</span>
                        <span className="text-muted-foreground">{ref.status === 'rewarded' ? `پاداش ${num(ref.reward_points)} امتیاز` : 'در انتظار تأیید'} · {jalaliDate(ref.created_date)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground">برنامه ارجاع در حال حاضر غیرفعال است.</p>
            )}
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4" />
              اشتراک حرفه‌ای
            </p>
            {activeSub ? (
              <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] leading-5 text-emerald-200">
                اشتراک شما فعال است تا {jalaliDate(activeSub.expires_at)}.
              </p>
            ) : pendingSub ? (
              <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-5 text-amber-200">
                درخواست اشتراک ثبت شده و در انتظار تأیید مدیر و اتصال درگاه پرداخت است.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl bg-muted/50 px-2.5 py-2">
                    <p className="font-semibold text-foreground">ماهانه</p>
                    <p className="text-muted-foreground">{toman(settings.pro_monthly_price)}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-2.5 py-2">
                    <p className="font-semibold text-foreground">سالانه</p>
                    <p className="text-muted-foreground">{toman(settings.pro_yearly_price)}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  disabled={busy === 'sub'}
                  onClick={() => run('sub', () => requestSubscription({ user, profile, plan: 'pro_monthly', price: settings.pro_monthly_price }), 'درخواست اشتراک ثبت شد.')}
                >
                  {busy === 'sub' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                  درخواست اشتراک ماهانه
                </Button>
              </>
            )}
            <p className="text-[10px] leading-5 text-muted-foreground">
              پرداخت اشتراک تا اتصال درگاه پرداخت انجام نمی‌شود؛ فعال‌سازی پس از تأیید مدیر ثبت می‌گردد.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/my-orders">سفارش‌های من</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/trades">معاملات من</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/notifications">اعلان‌ها</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/support">پشتیبانی</Link>
        </Button>
        {isAdmin ? (
          <Button asChild size="sm">
            <Link to="/admin">پنل مدیریت</Link>
          </Button>
        ) : null}
      </div>

      {loading ? <p className="text-[10px] text-muted-foreground">در حال به‌روزرسانی آمار…</p> : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}