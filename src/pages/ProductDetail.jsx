import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, ShieldAlert, ShoppingCart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import SignInPrompt from '@/components/SignInPrompt';
import { Image } from '@/components/ui/image';
import { PRODUCT_STATUSES } from '@/lib/credit';
import { buildStoreOrder, computeFeeAmount, resolveFeeRule } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { num, percent, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePlatformSettings from '@/hooks/usePlatformSettings';

export default function ProductDetail() {
  const { id } = useParams();
  const { user, profile, isAuthed, signIn } = useCurrentUser();
  const { settings } = usePlatformSettings();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wholesale, setWholesale] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [commission, setCommission] = useState({ rate: 0, amount: 0 });

  useEffect(() => {
    base44.entities.Product.get(id)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const qty = Math.max(1, Number(String(quantity).replace(/[^\d]/g, '')) || 1);
  const unitPrice = product ? Number(wholesale ? product.price_wholesale || product.price_retail : product.price_retail) : 0;
  const subtotal = useMemo(() => unitPrice * qty, [unitPrice, qty]);

  useEffect(() => {
    if (!subtotal) return;
    resolveFeeRule({ side: 'store', service: null })
      .then((rule) => setCommission({ rate: Number(rule?.rate_percent || 0), amount: computeFeeAmount(rule, subtotal) }))
      .catch(() => setCommission({ rate: 0, amount: 0 }));
  }, [subtotal]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const order = await buildStoreOrder({
        product,
        user,
        profile,
        quantity: qty,
        wholesale,
        deliveryAddress: address,
        contactPhone: phone || profile?.phone || '',
        buyerNote: note
      });
      setCreated(order);
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground">در حال بارگذاری کالا…</p>;
  if (!product) return <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">این کالا یافت نشد.</p>;

  const status = PRODUCT_STATUSES[product.status] || PRODUCT_STATUSES.active;
  const isOwner = product.seller_id === user?.id;

  return (
    <div className="space-y-4">
      <Link to="/store" className="inline-block text-[11px] font-medium text-primary hover:underline">
        ← بازگشت به فروشگاه
      </Link>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="h-48 w-full overflow-hidden rounded-xl bg-muted">
            {product.images?.[0] ? (
              <Image src={product.images[0]} alt={product.title} className="h-48 w-full" fittingType="fill" />
            ) : (
              <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">بدون تصویر</div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge label={status.label} tone={status.tone} />
            {product.is_demo ? <StatusBadge label="DEMO" tone="warning" /> : null}
            <span className="text-[11px] text-muted-foreground">{product.category}</span>
          </div>
          <h1 className="font-heading text-lg font-bold text-foreground">{product.title}</h1>
          <p className="text-[11px] leading-6 text-muted-foreground">{product.description || 'توضیحی ثبت نشده است.'}</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Info label="فروشنده" value={product.seller_name || 'ثبت نشده'} />
            <Info label="نوع تحویل" value={product.delivery_type === 'physical' ? 'فیزیکی' : product.delivery_type === 'service' ? 'خدمات' : 'دیجیتال'} />
            <Info label="موجودی" value={`${num(product.stock)} ${product.unit}`} />
            <Info label="تعداد فروش" value={num(product.sales_count)} />
          </div>
          {product.delivery_note ? <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-[10px] text-muted-foreground">{product.delivery_note}</p> : null}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <p className="font-heading text-lg font-bold text-foreground">{toman(unitPrice)}</p>
            <span className="text-[10px] text-muted-foreground">به‌ازای هر {product.unit}</span>
          </div>

          {product.price_wholesale ? (
            <div className="flex gap-1.5">
              <Button size="sm" variant={wholesale ? 'outline' : 'default'} className="h-8 text-[11px]" onClick={() => setWholesale(false)}>
                خرده‌فروشی
              </Button>
              <Button size="sm" variant={wholesale ? 'default' : 'outline'} className="h-8 text-[11px]" onClick={() => setWholesale(true)}>
                عمده (از {num(product.min_wholesale_qty)} عدد)
              </Button>
            </div>
          ) : null}

          {product.is_demo ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
              این کالا نمونه (DEMO) است و برای نمایش رابط کاربری ثبت شده؛ سفارش واقعی روی آن ممکن نیست.
            </p>
          ) : null}

          {settings.ton_enabled ? (
            <p className="flex items-start gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] leading-5 text-sky-900">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              پرداخت این سفارش روی شبکه TON انجام می‌شود؛ سفارش با وضعیت «در انتظار پرداخت» ثبت و مبلغ معادل تون برای هماهنگی به
              شما نمایش داده می‌شود.
            </p>
          ) : null}

          {created ? (
            <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                سفارش {created.order_code} ثبت شد
              </p>
              <p className="text-[11px] leading-6 text-emerald-900">
                وضعیت: در انتظار پرداخت · مبلغ {toman(created.subtotal)} · کمیسیون پلتفرم {toman(created.commission_amount)}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link to="/my-orders">پیگیری سفارش‌ها</Link>
              </Button>
            </div>
          ) : isOwner ? (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">این کالا متعلق به شماست؛ سفارش روی کالای خودتان ثبت نمی‌شود.</p>
          ) : !isAuthed ? (
            <SignInPrompt title="برای سفارش وارد شوید" onSignIn={signIn} />
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>تعداد</Label>
                  <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>تلفن تماس</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={profile?.phone || '۰۹…'} />
                </div>
              </div>
              {product.delivery_type === 'physical' ? (
                <div className="space-y-1.5">
                  <Label>نشانی تحویل</Label>
                  <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label>توضیح سفارش</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختیاری" />
              </div>

              <div className="space-y-1 rounded-xl bg-muted/50 p-2.5 text-[11px]">
                <Row label="جمع کالا" value={toman(subtotal)} />
                <Row label={`کمیسیون فروشگاه (${percent(commission.rate)})`} value={toman(commission.amount)} />
                <Row label="سهم فروشنده" value={toman(subtotal - commission.amount)} strong />
              </div>

              {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

              <Button type="submit" className="w-full gap-1.5" disabled={busy || product.is_demo}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                ثبت سفارش
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-[11px] font-medium text-foreground">{value}</p>
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-heading font-semibold text-foreground' : 'text-foreground'}>{value}</span>
    </div>
  );
}