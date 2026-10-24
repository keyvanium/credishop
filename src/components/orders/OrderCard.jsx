import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star, Timer } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { ORDER_STATUSES, serviceName } from '@/lib/credit';
import { compactToman, deadlineText, num, percent, toman } from '@/lib/format';

export default function OrderCard({ order }) {
  const status = ORDER_STATUSES[order.status] || ORDER_STATUSES.listed;
  const deadline = useMemo(() => deadlineText(order.listing_expires_at), [order.listing_expires_at]);
  const sideLabel = order.side === 'sell' ? 'فروشنده اعتبار' : 'خریدار اعتبار';
  const sideTone = order.side === 'sell' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-sky-500/10 text-sky-300';

  return (
    <Link
      to={`/market/${order.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${sideTone}`}>{sideLabel}</span>
          <span className="text-xs font-medium text-foreground">{serviceName(order.service)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {order.featured ? <StatusBadge label="ویژه" tone="warning" /> : null}
          <StatusBadge label={status.label} tone={status.tone} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">مبلغ اعتبار</p>
          <p className="font-heading text-sm font-semibold text-foreground">{compactToman(order.credit_amount)}</p>
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">قیمت کل</p>
          <p className="font-heading text-sm font-semibold text-foreground">{toman(order.total_price)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          {order.owner_display || 'کاربر'} · {num(order.owner_completed_trades || 0)} معامله
        </span>
        <span>{num(order.unit_rate)} تومان به‌ازای هر ۱۰۰۰ تومان اعتبار</span>
      </div>

      <div className="flex items-center justify-between border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" />
          {deadline ? deadline.text : 'بدون مهلت'}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition group-hover:opacity-100">
          جزئیات
          <ArrowLeft className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>کد {order.order_code}</span>
        <span>مهلت {num(order.deadline_minutes)} دقیقه</span>
      </div>
    </Link>
  );
}