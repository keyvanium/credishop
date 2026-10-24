import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarClock, CheckCircle2, Loader2, Sparkles, Star, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import Countdown from '@/components/Countdown';
import SignInPrompt from '@/components/SignInPrompt';
import StatusBadge from '@/components/StatusBadge';
import { deliveryName, ORDER_STATUSES, serviceName, VERIFICATION_STATUSES } from '@/lib/credit';
import { acceptOrder, cancelOrder, quoteFees, requestPromotion, syncOwnedOrders } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { jalaliDateTime, num, percent, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePlatformSettings from '@/hooks/usePlatformSettings';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, isAuthed, signIn, isAdmin } = useCurrentUser();
  const { settings } = usePlatformSettings();
  const [order, setOrder] = useState(null);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    try {
      const record = await base44.entities.Order.get(id);
      setOrder(record);
      setFees(await quoteFees({ service: record.service, price: record.total_price }));
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const accept = async () => {
    setError('');
    setBusy('accept');
    try {
      const { trade } = await acceptOrder({ order, user, profile, settings });
      await syncOwnedOrders(user);
      navigate(`/trades/${trade.id}`);
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const cancel = async () => {
    setError('');
    setBusy('cancel');
    try {
      await cancelOrder({ order, user, reason: 'لغو توسط صاحب سفارش' });
      await load();
      setNotice('سفارش لغو شد.');
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const promote = async () => {
    setError('');
    setBusy('promote');
    try {
      await requestPromotion({ order, user, profile, price: settings.featured_listing_price });
      setNotice('درخواست آگهی ویژه ثبت شد و پس از تأیید مدیر فعال می‌شود.');
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground">در حال بارگذاری سفارش…</p>;
  if (!order) return <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">این سفارش یافت نشد.</p>;

  const status = ORDER_STATUSES[order.status] || ORDER_STATUSES.listed;
  const isOwner = order.owner_id === user?.id;
  const canAccept = order.status === 'listed' && !isOwner;
  const verification = VERIFICATION_STATUSES[order.owner_verification] || VERIFICATION_STATUSES.unverified;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/market" className="text-[11px] font-medium text-primary hover:underline">
          ← بازگشت به مارکت‌لیست
        </Link>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground">کد سفارش {order.order_code}</p>
            <h1 className="font-heading text-lg font-bold text-foreground">
              {order.side === 'sell' ? 'فروش اعتبار' : 'خرید اعتبار'} {serviceName(order.service)}
            </h1>
            <p className="mt-1 text-[11px] text-muted-foreground">ثبت‌شده در {jalaliDateTime(order.created_date)}</p>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-muted-foreground">قیمت کل معامله</p>
            <p className="font-heading text-lg font-bold text-foreground">{toman(order.total_price)}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Info label="مبلغ اعتبار" value={toman(order.credit_amount)} />
          <Info label="نرخ هر ۱۰۰۰ تومان" value={`${num(order.unit_rate)} تومان`} />
          <Info label="مهلت انجام معامله" value={`${num(order.deadline_minutes)} دقیقه`} />
          <Info label="روش انتقال" value={deliveryName(order.delivery_method)} />
          <Info label="سفارش‌دهنده" value={order.owner_display || 'کاربر'} />
          <Info label="اعتبار کاربر" value={`${verification.label} · ${num(order.owner_completed_trades)} معامله`} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Countdown deadline={order.listing_expires_at} label="اعتبار آگهی" />
          {order.featured ? <StatusBadge label="آگهی ویژه" tone="warning" /> : null}
        </div>

        <div className="space-y-1.5 rounded-xl bg-muted/50 p-3">
          <p className="font-heading text-[12px] font-semibold text-foreground">شرایط معامله</p>
          <p className="text-[11px] leading-6 text-muted-foreground">{order.terms || 'شرطی ثبت نشده است.'}</p>
        </div>

        {fees ? (
          <div className="space-y-1.5 rounded-xl border border-border p-3 text-[11px]">
            <p className="font-heading text-[12px] font-semibold text-foreground">قیمت نهایی و کارمزد</p>
            <Line label="قیمت معامله" value={toman(fees.price)} />
            <Line label={`کارمزد خریدار (${percent(fees.buy_rule?.rate_percent || 0)})`} value={toman(fees.buyer_fee)} />
            <Line label={`کارمزد فروشنده (${percent(fees.sell_rule?.rate_percent || 0)})`} value={toman(fees.seller_fee)} />
            <Line label="پرداختی خریدار" value={toman(fees.buyer_pays)} strong />
            <Line label="دریافتی فروشنده" value={toman(fees.net_to_seller)} strong />
          </div>
        ) : null}

        {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

        {order.status === 'matched' ? (
          <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-[11px] text-sky-800">
            <CalendarClock className="h-4 w-4" />
            این سفارش در حال معامله است؛ پیگیری از صفحه معاملات من.
          </div>
        ) : null}

        {!isAuthed ? (
          <SignInPrompt title="برای پذیرش یا مدیریت سفارش وارد شوید" onSignIn={signIn} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {canAccept ? (
              <Button onClick={accept} disabled={!!busy} className="gap-1.5">
                {busy === 'accept' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                پذیرش سفارش و ساخت معامله
              </Button>
            ) : null}
            {isOwner && ['listed', 'draft'].includes(order.status) ? (
              <>
                <Button variant="outline" onClick={cancel} disabled={!!busy} className="gap-1.5">
                  {busy === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  لغو سفارش
                </Button>
                <Button variant="outline" onClick={promote} disabled={!!busy} className="gap-1.5">
                  {busy === 'promote' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  درخواست آگهی ویژه
                </Button>
              </>
            ) : null}
            {isOwner ? (
              <Button asChild variant="ghost" className="gap-1.5">
                <Link to={`/market/${order.id}`}>
                  <Star className="h-4 w-4" />
                  مشاهده عمومی
                </Link>
              </Button>
            ) : null}
            {isAdmin ? (
              <Button asChild variant="ghost" className="gap-1.5">
                <Link to="/admin">
                  <Users className="h-4 w-4" />
                  پنل مدیریت
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-[12px] font-medium text-foreground">{value}</p>
    </div>
  );
}

function Line({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-heading font-semibold text-foreground' : 'text-foreground'}>{value}</span>
    </div>
  );
}