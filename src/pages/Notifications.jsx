import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import SignInPrompt from '@/components/SignInPrompt';
import StatusBadge from '@/components/StatusBadge';
import { STORE_STATUSES, TRADE_STATUSES } from '@/lib/credit';
import { jalaliDateTime } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';

const ACTION_LABELS = {
  declare_payment: 'پرداخت اعلام شد',
  acknowledge_payment: 'فروشنده دریافت وجه را تأیید کرد',
  start_delivery: 'خرید و تحویل آغاز شد',
  complete_purchase: 'فروشنده اتمام خرید را اعلام کرد',
  confirm_receipt: 'خریدار دریافت اعتبار را تأیید کرد',
  cancel_trade: 'معامله لغو شد',
  open_dispute: 'اختلاف ثبت شد',
  admin_refund: 'بازپرداخت انجام شد',
  admin_resolve_seller: 'اختلاف به نفع فروشنده حل شد',
  deadline_expiry: 'مهلت مرحله به پایان رسید',
  add_evidence: 'مستند جدید ثبت شد',
  buyer_ledger: 'بدهی خریدار ثبت شد',
  seller_ledger: 'طلب فروشنده ثبت شد'
};

export default function Notifications() {
  const { user, isAuthed, signIn } = useCurrentUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [eventRes, ticketRes, announcementRes, tradeRes] = await Promise.all([
        base44.entities.TradeEvent.filter({ participant_ids: user.id }, { sort: '-occurred_at', limit: 30 }),
        base44.entities.SupportTicket.filter({ user_id: user.id, status: 'answered' }, { sort: '-last_reply_at', limit: 10 }),
        base44.entities.Notification.filter({ user_id: user.id }, { sort: '-created_date', limit: 20 }),
        base44.entities.Trade.filter({ participant_ids: user.id }, { sort: '-last_action_at', limit: 20 })
      ]);
      const feed = [];
      (announcementRes?.items || []).forEach((item) => {
        feed.push({
          id: `ann-${item.id}`,
          title: item.title,
          body: item.body,
          tone: item.severity === 'danger' ? 'danger' : item.severity === 'warning' ? 'warning' : 'info',
          label: 'اطلاعیه پلتفرم',
          time: item.created_date,
          unread: !item.read
        });
      });
      (eventRes?.items || []).forEach((item) => {
        feed.push({
          id: `evt-${item.id}`,
          title: ACTION_LABELS[item.action] || 'رویداد معامله',
          body: `${item.trade_code || ''} — ${item.note || ''}`,
          tone: item.to_status ? TRADE_STATUSES[item.to_status]?.tone || 'info' : 'info',
          label: item.to_status ? `وضعیت: ${TRADE_STATUSES[item.to_status]?.label || item.to_status}` : 'معامله',
          time: item.occurred_at || item.created_date,
          link: `/trades/${item.trade_id}`
        });
      });
      (tradeRes?.items || []).forEach((trade) => {
        if (!['awaiting_funding', 'funded', 'awaiting_delivery', 'purchase_in_progress', 'awaiting_confirmation', 'disputed'].includes(trade.status)) return;
        feed.push({
          id: `trade-${trade.id}`,
          title: `پیگیری معامله ${trade.trade_code}`,
          body: 'این معامله در جریان است و نیاز به اقدام یا پیگیری دارد.',
          tone: TRADE_STATUSES[trade.status]?.tone || 'info',
          label: TRADE_STATUSES[trade.status]?.label || trade.status,
          time: trade.last_action_at || trade.updated_date,
          link: `/trades/${trade.id}`
        });
      });
      (ticketRes?.items || []).forEach((ticket) => {
        feed.push({
          id: `ticket-${ticket.id}`,
          title: `پاسخ پشتیبانی به تیکت ${ticket.ticket_code}`,
          body: ticket.subject,
          tone: 'info',
          label: 'پشتیبانی',
          time: ticket.last_reply_at || ticket.updated_date,
          link: '/support'
        });
      });
      feed.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
      setItems(feed);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, [load]);

  if (!isAuthed) return <SignInPrompt title="اعلان‌ها" description="اعلان‌های شما از رویدادهای واقعی معاملات و سفارش‌ها ساخته می‌شود." onSignIn={signIn} />;

  const markAll = async () => {
    const unread = items.filter((item) => item.unread && item.id.startsWith('ann-'));
    await Promise.all(
      unread.map((item) => base44.entities.Notification.update(item.id.replace('ann-', ''), { read: true }))
    );
    await load();
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">اعلان‌ها</h1>
          <p className="text-[12px] text-muted-foreground">رویدادهای معاملات، سفارش‌ها و پاسخ‌های پشتیبانی</p>
        </div>
        {items.some((item) => item.unread) ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={markAll}>
            <CheckCheck className="h-4 w-4" />
            خواندن اطلاعیه‌ها
          </Button>
        ) : null}
      </header>

      {loading ? <p className="text-xs text-muted-foreground">در حال بارگذاری…</p> : null}

      {!loading && !items.length ? (
        <EmptyState title="اعلانی ندارید" description="با ثبت سفارش و شروع معامله، رویدادها در این بخش نمایش داده می‌شوند." icon={Bell} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const content = (
              <div className={`flex items-start justify-between gap-3 rounded-2xl border bg-card px-3.5 py-3 ${item.unread ? 'border-primary/30' : 'border-border'}`}>
                <div className="space-y-1">
                  <p className="text-[12px] font-semibold text-foreground">{item.title}</p>
                  {item.body ? <p className="text-[11px] leading-5 text-muted-foreground">{item.body}</p> : null}
                  <p className="text-[10px] text-muted-foreground">{jalaliDateTime(item.time)}</p>
                </div>
                <StatusBadge label={item.label} tone={item.tone} />
              </div>
            );
            return item.link ? (
              <Link key={item.id} to={item.link} className="block transition hover:opacity-90">
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] leading-5 text-muted-foreground">
        اعلان‌های بیرونی (ایمیل یا پیامک) نیازمند اتصال سرویس ارسال است و در حال حاضر فعال نیست.
      </p>
    </div>
  );
}