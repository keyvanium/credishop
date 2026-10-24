import { TRADE_STATUSES } from '@/lib/credit';
import { jalaliDateTime } from '@/lib/format';
import { roleLabel } from '@/lib/engine';

const EVENT_TITLES = {
  created: 'ایجاد معامله',
  transition: 'تغییر وضعیت',
  evidence: 'ثبت مستند',
  expiry: 'پایان مهلت',
  dispute: 'اختلاف',
  refund: 'بازپرداخت',
  settlement: 'ثبت مالی',
  system: 'اقدام مدیریتی'
};

const ACTION_TITLES = {
  declare_payment: 'اعلام پرداخت وجه',
  acknowledge_payment: 'تأیید دریافت وجه',
  start_delivery: 'شروع خرید و تحویل',
  complete_purchase: 'اعلام اتمام خرید',
  confirm_receipt: 'تأیید دریافت اعتبار',
  cancel_trade: 'لغو معامله',
  open_dispute: 'ثبت اختلاف',
  admin_resolve_seller: 'حل اختلاف به نفع فروشنده',
  admin_refund: 'بازپرداخت به خریدار',
  admin_cancel: 'لغو توسط مدیر',
  buyer_ledger: 'ثبت بدهی خریدار',
  seller_ledger: 'ثبت طلب فروشنده',
  add_evidence: 'بارگذاری مستند',
  deadline_expiry: 'انقضای مهلت'
};

export default function TradeTimeline({ events = [] }) {
  if (!events.length) {
    return <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">رویدادی ثبت نشده است.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const to = TRADE_STATUSES[event.to_status];
        return (
          <li key={event.id} className="relative rounded-xl border border-border bg-card px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="font-heading text-[13px] font-semibold text-foreground">
                  {ACTION_TITLES[event.action] || EVENT_TITLES[event.type] || 'رویداد'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {event.actor_name || 'سیستم'} · {roleLabel(event.actor_role)}
                  {to ? ` · وضعیت جدید: ${to.label}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">{jalaliDateTime(event.occurred_at || event.created_date)}</span>
            </div>
            {event.note ? <p className="mt-1.5 rounded-lg bg-muted/60 px-2 py-1.5 text-[11px] leading-5 text-foreground">{event.note}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}