import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Info } from 'lucide-react';
import OrderForm from '@/components/orders/OrderForm';
import SignInPrompt from '@/components/SignInPrompt';
import { Button } from '@/components/ui/button';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePlatformSettings from '@/hooks/usePlatformSettings';
import { toman } from '@/lib/format';

const COPY = {
  sell: {
    title: 'فروش اعتبار',
    subtitle: 'اعتبار خرید خود را با قیمت و مهلت دلخواه آگهی کنید؛ کارمزد و مبلغ دریافتی پیش از ثبت نمایش داده می‌شود.',
    rules: [
      'روش انتقال باید یکی از روش‌های مجاز و امن پلتفرم باشد؛ دریافت کد یک‌بارمصرف ورود ممنوع است.',
      'پس از تطبیق، پرداخت خریدار مستند می‌شود و سپس خرید و تحویل را انجام می‌دهید.',
      'تسویه مالی پس از تأیید خریدار و با رعایت مهلت‌ها انجام می‌شود.'
    ]
  },
  buy: {
    title: 'خرید اعتبار',
    subtitle: 'نیاز خود به اعتبار را ثبت کنید تا فروشنده آن را بپذیرد؛ قیمت نهایی و کارمزد شفاف محاسبه می‌شود.',
    rules: [
      'پیش از اعلام پرداخت، شرایط معامله و روش تحویل را دقیق بررسی کنید.',
      'پرداخت خود را فقط با رسید قابل استناد اعلام کنید؛ مستندات در پرونده معامله ثبت می‌شوند.',
      'تحویل را تنها پس از دریافت واقعی اعتبار تأیید کنید.'
    ]
  }
};

export default function CreditOrder({ side }) {
  const copy = COPY[side];
  const { user, profile, isAuthed, signIn } = useCurrentUser();
  const { settings, loading } = usePlatformSettings();
  const [created, setCreated] = useState(null);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">{copy.title}</h1>
        <p className="max-w-2xl text-[12px] leading-6 text-muted-foreground">{copy.subtitle}</p>
      </header>

      {created ? (
        <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            سفارش شما ثبت و در مارکت‌لیست منتشر شد.
          </p>
          <p className="text-[11px] leading-6 text-emerald-900">
            کد سفارش: <span className="font-semibold">{created.order.order_code}</span> · قیمت {' '}
            {toman(created.order.total_price)} · کارمزد شما {toman(side === 'sell' ? created.fees.seller_fee : created.fees.buyer_fee)}
          </p>
          <div className="flex gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <Link to={`/market/${created.order.id}`}>مشاهده سفارش</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>
              ثبت سفارش دیگر
            </Button>
          </div>
        </div>
      ) : null}

      {!isAuthed ? (
        <SignInPrompt
          title="برای ثبت سفارش وارد شوید"
          description="سفارش‌ها به حساب شما گره می‌خورند تا مالکیت، مهلت‌ها و سابقه معامله قابل ردیابی باشد."
          onSignIn={signIn}
        />
      ) : loading ? (
        <p className="text-xs text-muted-foreground">در حال آماده‌سازی…</p>
      ) : (
        <OrderForm side={side} user={user} profile={profile} settings={settings} onCreated={setCreated} />
      )}

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 font-heading text-[13px] font-semibold text-foreground">
          <Info className="h-4 w-4" />
          قواعد الزامی این بخش
        </p>
        <ul className="space-y-1.5 text-[11px] leading-6 text-muted-foreground">
          {copy.rules.map((rule) => (
            <li key={rule} className="flex gap-1.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}