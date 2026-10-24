import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Blocks, CheckCircle2, Fingerprint, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { CONNECTION_STATUS, EXTERNAL_CONNECTIONS, TRADE_FLOW, TRADE_STATUSES } from '@/lib/credit';
import { jalaliDateTime } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';

const RULES = [
  { title: 'انتقال وضعیت فقط با عملیات مجاز', text: 'هر تغییر وضعیت از میان عملیات تعریف‌شده و با نقش مشخص (خریدار، فروشنده، مدیر) انجام می‌شود؛ سایر انتقال‌ها رد می‌شوند.' },
  { title: 'شناسه یکتا و هش قرارداد', text: 'هر معامله شناسه یکتا و هش SHA-256 از شرایط دارد؛ تغییر شرایط، هش را تغییر می‌دهد و قابل ردیابی است.' },
  { title: 'جلوگیری از تأیید و تسویه تکراری', text: 'تأیید خریدار تنها یک‌بار پذیرفته می‌شود و ثبت رکورد مالی برای هر معامله فقط یک‌بار ممکن است.' },
  { title: 'مهلت‌ها و توقف تسویه خودکار', text: 'انقضای مهلت پرداخت، تحویل یا تأیید، معامله را متوقف و وضعیت اختلاف ثبت می‌کند تا بررسی دستی انجام شود.' },
  { title: 'شرط آزادسازی وجه', text: 'تا اتصال و تأیید درگاه پرداخت یا امانت‌داری، هیچ وجهی آزاد یا پرداخت نمی‌شود؛ رکوردها «در انتظار تسویه» می‌مانند.' },
  { title: 'مستندات با دسترسی محدود', text: 'هر مستند سطح دسترسی خود را دارد: خصوصی، مشترک با طرف مقابل یا مخصوص بررسی مدیر.' }
];

export default function SmartContract() {
  const { user, isAuthed, signIn } = useCurrentUser();
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Trade.filter({ participant_ids: user.id }, { sort: '-created_date', limit: 20 })
      .then((res) => setTrades(res?.items || []))
      .catch(() => setTrades([]));
  }, [user]);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">اسمارت کانترکت معامله</h1>
        <p className="max-w-2xl text-[12px] leading-6 text-muted-foreground">
          قرارداد معامله در پلتفرم با وضعیت‌های صریح، رویدادهای ثبت‌شده و شرایط غیرقابل‌ابهام اجرا می‌شود. این قرارداد در نسخه فعلی
          داخل پلتفرم اجرا می‌شود و اتصال آن به بلاک‌چین فعال نیست.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <p className="font-heading text-sm font-bold text-foreground">چرخه وضعیت‌ها</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {TRADE_FLOW.map((status, index) => (
            <span key={status} className="flex items-center gap-1.5">
              <StatusBadge label={TRADE_STATUSES[status].label} tone={TRADE_STATUSES[status].tone} />
              {index < TRADE_FLOW.length - 1 ? <span className="text-muted-foreground">←</span> : null}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground">وضعیت‌های پایانی جایگزین:</span>
          {['cancelled', 'disputed', 'refunded'].map((status) => (
            <StatusBadge key={status} label={TRADE_STATUSES[status].label} tone={TRADE_STATUSES[status].tone} />
          ))}
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        {RULES.map((rule) => (
          <div key={rule.title} className="space-y-1 rounded-2xl border border-border bg-card p-3.5">
            <p className="flex items-center gap-1.5 font-heading text-[13px] font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {rule.title}
            </p>
            <p className="text-[11px] leading-6 text-muted-foreground">{rule.text}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
          <Fingerprint className="h-4 w-4" />
          قراردادهای من
        </p>
        {!isAuthed ? (
          <p className="text-[11px] text-muted-foreground">
            برای دیدن هش قرارداد معاملات خود{' '}
            <button className="font-medium text-primary underline" onClick={signIn}>وارد شوید</button>.
          </p>
        ) : trades.length ? (
          <div className="space-y-2">
            {trades.map((trade) => (
              <Link key={trade.id} to={`/trades/${trade.id}`} className="block rounded-xl bg-muted/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-foreground">{trade.trade_code}</p>
                  <StatusBadge label={TRADE_STATUSES[trade.status]?.label || trade.status} tone={TRADE_STATUSES[trade.status]?.tone || 'muted'} />
                </div>
                <p className="mt-1 truncate text-[10px] text-muted-foreground" dir="ltr">{trade.contract_hash}</p>
                <p className="text-[10px] text-muted-foreground">{jalaliDateTime(trade.created_date)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">هنوز قراردادی برای شما ثبت نشده است.</p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
          <Blocks className="h-4 w-4" />
          آمادگی اتصال‌های آینده
        </p>
        <div className="space-y-1.5">
          {EXTERNAL_CONNECTIONS.filter((c) => ['ton_network', 'games', 'escrow', 'credit_api', 'telegram_bot'].includes(c.id)).map((conn) => (
            <div key={conn.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
              <div>
                <p className="text-[12px] font-medium text-foreground">{conn.name}</p>
                <p className="text-[10px] text-muted-foreground">{conn.note}</p>
              </div>
              <StatusBadge label={CONNECTION_STATUS[conn.status].label} tone={CONNECTION_STATUS[conn.status].tone} />
            </div>
          ))}
        </div>
        <p className="flex items-start gap-1.5 rounded-lg bg-muted/60 px-2.5 py-2 text-[10px] leading-5 text-muted-foreground">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" />
          توکن اختصاصی، نگهداری رمزارز، انتقال وجه بلاک‌چینی و بازی پولی در این نسخه به‌صورت عمدی غیرفعال است. معماری رویدادمحور
          امکان افزودن این قابلیت‌ها را بدون بازنویسی هسته فراهم می‌کند.
        </p>
      </section>
    </div>
  );
}