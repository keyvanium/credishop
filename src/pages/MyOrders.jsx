import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import SignInPrompt from '@/components/SignInPrompt';
import StatusBadge from '@/components/StatusBadge';
import { ORDER_STATUSES, STORE_STATUSES, serviceName } from '@/lib/credit';
import { cancelOrder, syncOwnedOrders, updateStoreOrderStatus } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { jalaliDateTime, num, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';

const SELLER_ACTIONS = {
  awaiting_payment: [{ to: 'processing', label: 'شروع آماده‌سازی' }, { to: 'cancelled', label: 'لغو' }],
  processing: [{ to: 'delivered', label: 'ثبت تحویل' }, { to: 'disputed', label: 'ثبت اختلاف' }]
};
const BUYER_ACTIONS = {
  awaiting_payment: [{ to: 'cancelled', label: 'لغو سفارش' }],
  processing: [{ to: 'disputed', label: 'ثبت اختلاف' }],
  delivered: [{ to: 'disputed', label: 'ثبت اختلاف' }]
};

export default function MyOrders() {
  const { user, profile, isAuthed, signIn, isAdmin } = useCurrentUser();
  const [tab, setTab] = useState('credit');
  const [orders, setOrders] = useState([]);
  const [storeOrders, setStoreOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await syncOwnedOrders(user);
      const [orderRes, storeRes] = await Promise.all([
        base44.entities.Order.filter({ owner_id: user.id }, { sort: '-created_date', limit: 50 }),
        base44.entities.StoreOrder.filter({ participant_ids: user.id }, { sort: '-created_date', limit: 50 })
      ]);
      setOrders(orderRes?.items || []);
      setStoreOrders(storeRes?.items || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  if (!isAuthed) return <SignInPrompt title="سفارش‌های من" description="برای دیدن سفارش‌ها و معاملات خود وارد شوید." onSignIn={signIn} />;

  const cancel = async (order) => {
    setBusy(order.id);
    setError('');
    try {
      await cancelOrder({ order, user, reason: 'لغو توسط صاحب سفارش' });
      await load();
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const storeAction = async (order, nextStatus) => {
    setBusy(order.id + nextStatus);
    setError('');
    try {
      await updateStoreOrderStatus({ order, user, nextStatus, note: nextStatus === 'cancelled' ? 'لغو سفارش' : '' });
      await load();
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">سفارش‌های من</h1>
        <p className="text-[12px] text-muted-foreground">آگهی‌های بازار اعتبار و سفارش‌های فروشگاه در یک‌جا</p>
      </header>

      <div className="flex gap-1.5">
        {[
          { id: 'credit', label: 'اعتبار' },
          { id: 'store', label: 'فروشگاه' }
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

      {error ? <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p> : null}
      {loading ? <p className="text-xs text-muted-foreground">در حال بارگذاری…</p> : null}

      {!loading && tab === 'credit' ? (
        orders.length ? (
          <div className="space-y-2">
            {orders.map((order) => {
              const status = ORDER_STATUSES[order.status] || ORDER_STATUSES.listed;
              return (
                <div key={order.id} className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">
                        {order.side === 'sell' ? 'فروش' : 'خرید'} اعتبار {serviceName(order.service)} · {order.order_code}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {toman(order.credit_amount)} اعتبار · قیمت {toman(order.total_price)} · {jalaliDateTime(order.created_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {order.featured ? <StatusBadge label="ویژه" tone="warning" /> : null}
                      <StatusBadge label={status.label} tone={status.tone} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button asChild size="sm" variant="outline" className="h-8 text-[11px]">
                      <Link to={`/market/${order.id}`}>مشاهده سفارش</Link>
                    </Button>
                    {order.accepted_trade_id ? (
                      <Button asChild size="sm" className="h-8 text-[11px]">
                        <Link to={`/trades/${order.accepted_trade_id}`}>معامله مرتبط</Link>
                      </Button>
                    ) : null}
                    {['listed', 'draft'].includes(order.status) ? (
                      <Button size="sm" variant="ghost" className="h-8 text-[11px] text-rose-300" disabled={!!busy} onClick={() => cancel(order)}>
                        {busy === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        لغو
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="سفارشی ثبت نکرده‌اید" description="از بخش خرید یا فروش اعتبار اولین سفارش خود را بسازید." />
        )
      ) : null}

      {!loading && tab === 'store' ? (
        storeOrders.length ? (
          <div className="space-y-2">
            {storeOrders.map((order) => {
              const status = STORE_STATUSES[order.status] || STORE_STATUSES.awaiting_payment;
              const isSeller = order.seller_id === user.id;
              const actions = (isSeller ? SELLER_ACTIONS : BUYER_ACTIONS)[order.status] || [];
              return (
                <div key={order.id} className="space-y-2 rounded-2xl border border-border bg-card p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold text-foreground">{order.product_title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.order_code} · {num(order.quantity)} × {toman(order.unit_price)} · {isSeller ? `خریدار: ${order.buyer_name}` : `فروشنده: ${order.seller_name}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        کمیسیون پلتفرم {toman(order.commission_amount)} · سهم فروشنده {toman(order.seller_net)}
                      </p>
                    </div>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </div>
                  {order.payment_status === 'not_configured' ? (
                    <p className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-[10px] leading-5 text-amber-200">
                      پرداخت آنلاین فروشگاه متصل نیست؛ هماهنگی وجه بین خریدار و فروشنده انجام می‌شود و رکورد مالی «در انتظار تسویه» است.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5">
                    {actions.map((action) => (
                      <Button
                        key={action.to}
                        size="sm"
                        variant={action.to === 'cancelled' || action.to === 'disputed' ? 'outline' : 'default'}
                        className="h-8 text-[11px]"
                        disabled={!!busy}
                        onClick={() => storeAction(order, action.to)}
                      >
                        {busy === order.id + action.to ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {action.label}
                      </Button>
                    ))}
                    {isAdmin && ['delivered', 'disputed'].includes(order.status) ? (
                      <Button size="sm" variant="outline" className="h-8 text-[11px] text-rose-300" disabled={!!busy} onClick={() => storeAction(order, 'refunded')}>
                        بازپرداخت (مدیر)
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="سفارش فروشگاهی ندارید" description="از فروشگاه کالا انتخاب کنید یا محصول خود را برای فروش ثبت کنید." icon={Package} />
        )
      ) : null}
    </div>
  );
}