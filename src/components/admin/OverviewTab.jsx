import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, BadgePercent, CircleDollarSign, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { CONNECTION_STATUS, EXTERNAL_CONNECTIONS, TRADE_STATUSES } from '@/lib/credit';
import { num, toman } from '@/lib/format';

const Kpi = ({ label, value, hint, icon: Icon, tone = 'text-primary' }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <Icon className={`h-4 w-4 ${tone}`} />
    </div>
    <p className="mt-2 font-heading text-lg font-bold text-foreground">{value}</p>
    {hint ? <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{hint}</p> : null}
  </div>
);

export default function OverviewTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [tradeAgg, storeAgg, subs, promos, listedOrders, openTickets, refunds] = await Promise.all([
          base44.entities.Trade.aggregate({ groupBy: 'status', sum: ['platform_fee_total', 'buyer_pays', 'net_to_seller'] }),
          base44.entities.StoreOrder.aggregate({ groupBy: 'status', sum: ['commission_amount', 'subtotal'] }),
          base44.entities.Subscription.filter({ status: 'active' }, { limit: 100 }),
          base44.entities.OrderPromotion.filter({ status: 'active' }, { limit: 100 }),
          base44.entities.Order.count({ status: 'listed' }),
          base44.entities.SupportTicket.count({ status: 'open' }),
          base44.entities.LedgerEntry.aggregate({ groupBy: 'status', sum: ['amount'] })
        ]);
        if (!active) return;
        setData({
          tradeRows: tradeAgg?.rows || [],
          storeRows: storeAgg?.rows || [],
          subscriptions: subs?.items || [],
          promotions: promos?.items || [],
          listedOrders,
          openTickets,
          ledgerRows: refunds?.rows || []
        });
      } catch (err) {
        if (active) setError(err?.message || 'خطا در بارگذاری گزارش‌ها');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>;
  if (!data) return <p className="text-xs text-muted-foreground">در حال محاسبه گزارش‌ها…</p>;

  const row = (rows, status) => rows.find((r) => r.status === status) || {};
  const settled = row(data.tradeRows, 'settled');
  const disputed = row(data.tradeRows, 'disputed');
  const refunded = row(data.tradeRows, 'refunded');
  const delivered = row(data.storeRows, 'delivered');
  const refundedStore = row(data.storeRows, 'refunded');
  const subsRevenue = data.subscriptions.reduce((s, x) => s + Number(x.price || 0), 0);
  const promoRevenue = data.promotions.reduce((s, x) => s + Number(x.price || 0), 0);
  const tradeFees = Number(settled.sum_platform_fee_total || 0);
  const storeCommission = Number(delivered.sum_commission_amount || 0);
  const refundTotal = Number(refunded.sum_buyer_pays || 0) + Number(refundedStore.sum_subtotal || 0);
  const accrued = tradeFees + storeCommission + subsRevenue + promoRevenue;
  const net = accrued - refundTotal;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="سفارش فعال بازار" value={num(data.listedOrders)} icon={Activity} hint="آگهی‌های آماده پذیرش" />
        <Kpi label="معاملات تکمیل‌شده" value={num(settled.count || 0)} icon={CircleDollarSign} hint={`کارمزد تعهدی: ${toman(tradeFees)}`} />
        <Kpi label="اختلاف‌های باز" value={num(disputed.count || 0)} icon={AlertTriangle} tone="text-rose-500" hint="نیازمند بررسی و تصمیم مدیر" />
        <Kpi label="تیکت‌های باز" value={num(data.openTickets)} icon={Wallet} hint="پشتیبانی کاربران" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
            <BadgePercent className="h-4 w-4" />
            گزارش سود و زیان (تعهدی)
          </p>
          <div className="space-y-1.5 text-xs">
            <ReportRow label="کارمزد معاملات اعتبار" value={toman(tradeFees)} />
            <ReportRow label="کمیسیون فروشگاه" value={toman(storeCommission)} />
            <ReportRow label="اشتراک حرفه‌ای" value={toman(subsRevenue)} />
            <ReportRow label="آگهی ویژه" value={toman(promoRevenue)} />
            <ReportRow label="جمع درآمد تعهدی" value={toman(accrued)} strong />
            <ReportRow label="بازپرداخت‌ها" value={`− ${toman(refundTotal)}`} tone="text-rose-300" />
            <ReportRow label="سود خالص تعهدی" value={toman(net)} strong />
            <ReportRow label="وجه دریافتی واقعی" value="۰ تومان" tone="text-muted-foreground" />
          </div>
          <p className="mt-2 rounded-lg bg-amber-500/10 px-2.5 py-2 text-[10px] leading-5 text-amber-200">
            هیچ مبلغی تا اتصال درگاه پرداخت دریافت یا پرداخت نشده است؛ اعداد بالا تعهدی هستند و از رکوردهای واقعی معاملات محاسبه می‌شوند.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 font-heading text-sm font-semibold text-foreground">وضعیت اتصال‌های خارجی</p>
          <div className="space-y-2">
            {EXTERNAL_CONNECTIONS.map((conn) => {
              const status = CONNECTION_STATUS[conn.status];
              return (
                <div key={conn.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{conn.name}</p>
                    <p className="text-[10px] text-muted-foreground">{conn.note}</p>
                  </div>
                  <StatusBadge label={status.label} tone={status.tone} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 font-heading text-sm font-semibold text-foreground">توزیع معاملات بر اساس وضعیت</p>
        <div className="flex flex-wrap gap-2">
          {data.tradeRows.length ? (
            data.tradeRows.map((r) => (
              <span key={r.status} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-[11px]">
                <StatusBadge label={TRADE_STATUSES[r.status]?.label || r.status} tone={TRADE_STATUSES[r.status]?.tone || 'muted'} />
                <span className="font-semibold text-foreground">{num(r.count)}</span>
              </span>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">هنوز معامله‌ای ثبت نشده است.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
          <ArrowUpRight className="h-4 w-4" />
          مسیرهای درآمدی آماده
        </p>
        <p className="text-[11px] leading-6 text-muted-foreground">
          کارمزد معامله، کمیسیون فروشگاه، اشتراک حرفه‌ای، آگهی ویژه و ارجاع کاربران در همین پنل قابل تنظیم و گزارش‌گیری هستند.
          فعال‌سازی دریافت واقعی این درآمدها به اتصال درگاه پرداخت و امانت‌داری نیاز دارد.
        </p>
      </div>
    </div>
  );
}

function ReportRow({ label, value, strong, tone }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${strong ? 'font-heading font-bold' : 'font-medium'} ${tone || 'text-foreground'}`}>{value}</span>
    </div>
  );
}