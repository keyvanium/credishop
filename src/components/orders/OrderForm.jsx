import { useEffect, useMemo, useState } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DELIVERY_METHODS, SERVICES } from '@/lib/credit';
import { createOrder, quoteFees, validateOrderInput } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { num, parseAmount, percent, toman } from '@/lib/format';

const DEFAULTS = {
  service: 'digipay',
  creditAmount: '',
  price: '',
  deadlineMinutes: '60',
  deliveryMethod: 'in_app_purchase',
  terms: ''
};

export default function OrderForm({ side, user, profile, settings, onCreated }) {
  const [values, setValues] = useState(DEFAULTS);
  const [fees, setFees] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const credit = parseAmount(values.creditAmount);
  const price = parseAmount(values.price);

  useEffect(() => {
    let active = true;
    if (!price) {
      setFees(null);
      return () => {
        active = false;
      };
    }
    quoteFees({ service: values.service, price })
      .then((res) => active && setFees(res))
      .catch(() => active && setFees(null));
    return () => {
      active = false;
    };
  }, [values.service, price]);

  const update = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const unitRate = useMemo(
    () => (credit > 0 && price > 0 ? Math.round((price / credit) * 1000) : 0),
    [credit, price]
  );

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      validateOrderInput(
        {
          service: values.service,
          side,
          creditAmount: credit,
          price,
          deadlineMinutes: Number(values.deadlineMinutes),
          terms: values.terms,
          deliveryMethod: values.deliveryMethod
        },
        settings
      );
      const result = await createOrder({
        user,
        profile,
        service: values.service,
        side,
        creditAmount: credit,
        price,
        deadlineMinutes: Number(values.deadlineMinutes),
        terms: values.terms,
        deliveryMethod: values.deliveryMethod,
        settings
      });
      setValues(DEFAULTS);
      setFees(null);
      onCreated?.(result);
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const finalForMe = side === 'sell' ? fees?.net_to_seller : fees?.buyer_pays;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>سرویس</Label>
          <select
            value={values.service}
            onChange={update('service')}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {SERVICES.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} — {service.category}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>روش انتقال مجاز</Label>
          <select
            value={values.deliveryMethod}
            onChange={update('deliveryMethod')}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {DELIVERY_METHODS.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>مبلغ اعتبار (تومان)</Label>
          <Input
            inputMode="numeric"
            value={values.creditAmount ? num(credit) : ''}
            onChange={(event) => setValues((prev) => ({ ...prev, creditAmount: String(parseAmount(event.target.value)) }))}
            placeholder="مثلاً ۵٬۰۰۰٬۰۰۰"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{side === 'sell' ? 'قیمت درخواستی شما' : 'قیمت پیشنهادی شما'} (تومان)</Label>
          <Input
            inputMode="numeric"
            value={values.price ? num(price) : ''}
            onChange={(event) => setValues((prev) => ({ ...prev, price: String(parseAmount(event.target.value)) }))}
            placeholder="مبلغ کل معامله"
          />
        </div>
        <div className="space-y-1.5">
          <Label>مهلت انجام معامله</Label>
          <select
            value={values.deadlineMinutes}
            onChange={update('deadlineMinutes')}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="30">۳۰ دقیقه</option>
            <option value="60">۱ ساعت</option>
            <option value="120">۲ ساعت</option>
            <option value="360">۶ ساعت</option>
            <option value="1440">۲۴ ساعت</option>
          </select>
          <p className="text-[10px] leading-5 text-muted-foreground">
            پس از قفل‌شدن مبلغ موردتوافق در قرارداد، خریدار در همین بازه فرصت خرج کردن اعتبار را دارد.
          </p>
        </div>
        <div className="flex items-end">
          <div className="w-full rounded-xl border border-dashed border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            نرخ هر ۱۰۰۰ تومان اعتبار: <span className="font-semibold text-foreground">{unitRate ? num(unitRate) : '—'}</span> تومان
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>شرایط معامله</Label>
        <Textarea
          rows={3}
          value={values.terms}
          onChange={update('terms')}
          placeholder="مثلاً: اعتبار فقط برای خرید کالای فیزیکی استفاده می‌شود، تحویل حداکثر ۳۰ دقیقه پس از پرداخت."
        />
      </div>

      {fees ? (
        <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-heading text-[13px] font-semibold text-foreground">
            <Calculator className="h-4 w-4" />
            محاسبه شفاف کارمزد پیش از تأیید
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Row label="قیمت معامله" value={toman(fees.price)} />
            <Row label={`کارمزد خریدار (${percent(fees.buy_rule?.rate_percent || 0)})`} value={toman(fees.buyer_fee)} />
            <Row label={`کارمزد فروشنده (${percent(fees.sell_rule?.rate_percent || 0)})`} value={toman(fees.seller_fee)} />
            <Row label="کارمزد کل پلتفرم" value={toman(fees.platform_fee_total)} />
            <Row label="مبلغ پرداختی خریدار" value={toman(fees.buyer_pays)} strong />
            <Row label="دریافتی فروشنده" value={toman(fees.net_to_seller)} strong />
          </div>
          <p className="text-[11px] text-muted-foreground">
            مبلغ نهایی برای شما: <span className="font-semibold text-foreground">{finalForMe ? toman(finalForMe) : '—'}</span> — کارمزدها
            پیش از تأیید نهایی نمایش داده می‌شوند و در قرارداد معامله ثبت می‌گردند.
          </p>
        </div>
      ) : null}

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

      <Button type="submit" className="w-full gap-2" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        ثبت سفارش {side === 'sell' ? 'فروش اعتبار' : 'خرید اعتبار'}
      </Button>
    </form>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-heading font-semibold text-foreground' : 'text-foreground'}>{value}</span>
    </div>
  );
}