import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { TIERS, VERIFICATION_STATUSES } from '@/lib/credit';
import { adminRecomputeStats, adminSetUserRole, adminSetVerification } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { num } from '@/lib/format';

export default function UsersTab({ user }) {
  const [profiles, setProfiles] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await base44.entities.UserProfile.list('-created_date', 100);
    setProfiles(Array.isArray(res) ? res : res?.items || []);
  };

  useEffect(() => {
    load().catch(() => setError('بارگذاری کاربران ممکن نشد.'));
  }, []);

  const run = async (id, action) => {
    setError('');
    setMessage('');
    setBusy(id + action);
    try {
      await action();
      await load();
      setMessage('تغییرات ذخیره شد.');
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{message}</p> : null}
      {!profiles.length ? <p className="text-xs text-muted-foreground">هنوز پروفایلی ثبت نشده است.</p> : null}

      {profiles.map((profile) => {
        const verification = VERIFICATION_STATUSES[profile.verification_status] || VERIFICATION_STATUSES.unverified;
        return (
          <div key={profile.id} className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-foreground">{profile.display_name || profile.full_name || 'کاربر'}</p>
                <p className="text-[11px] text-muted-foreground">
                  سطح {TIERS[profile.tier]?.label || profile.tier} · {num(profile.completed_trades)} معامله موفق · {num(profile.disputed_trades)} اختلاف
                </p>
                {profile.phone ? <p className="text-[11px] text-muted-foreground">تلفن: {profile.phone}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge label={verification.label} tone={verification.tone} />
                {profile.subscription_plan === 'pro' ? <StatusBadge label="اشتراک حرفه‌ای" tone="info" /> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[11px]"
                disabled={!!busy}
                onClick={() => run(profile.id, () => adminSetVerification({ user, profile, status: 'verified' }))}
              >
                {busy === profile.id + 'verify' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                تأیید هویت
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[11px]"
                disabled={!!busy}
                onClick={() => run(profile.id, () => adminRecomputeStats({ user, profile }))}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                بازمحاسبه آمار
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={!!busy}
                onClick={() => run(profile.id, () => adminSetUserRole({ user, targetUserId: profile.user_id, role: profile.role === 'admin' ? 'user' : 'admin' }))}
              >
                ارتقا به مدیر
              </Button>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] leading-5 text-muted-foreground">
        نقش‌ها با ثبت در گزارش رویدادهای حساس ذخیره می‌شوند. تغییر نقش حساب خودتان برای جلوگیری از قفل‌شدن پنل مجاز نیست.
      </p>
    </div>
  );
}