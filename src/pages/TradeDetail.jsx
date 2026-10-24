import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Fingerprint, Loader2, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import Countdown from '@/components/Countdown';
import StatusBadge from '@/components/StatusBadge';
import TradeActionPanel from '@/components/trades/TradeActionPanel';
import TradeTimeline from '@/components/trades/TradeTimeline';
import EvidencePanel from '@/components/trades/EvidencePanel';
import { deliveryName, serviceName, TRADE_STATUSES } from '@/lib/credit';
import { releasePayout } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { jalaliDateTime, num, percent, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePlatformSettings from '@/hooks/usePlatformSettings';

export default function TradeDetail() {
  const { id } = useParams();
  const { user, profile, isAdmin, isAuthed, signIn } = useCurrentUser();
  const { settings } = usePlatformSettings();
  const [trade, setTrade] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const record = await base44.entities.Trade.get(id);
      setTrade(record);
      const eventRes = await base44.entities.TradeEvent.filter({ trade_id: id }, { sort: '-created_date', limit: 100 });
      setEvents(eventRes?.items || []);
    } catch {
      setTrade(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-xs text-muted-foreground">در حال بارگذاری معامله…</p>;
  if (!trade) return <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">این معامله یافت نشد یا دسترسی به آن ندارید.</p>;

  const status = TRADE_STATUSES[trade.status] || TRADE_STATUSES.matched;
  const deadline = trade.status === 'awaiting_funding'
    ? trade.funding_deadline_at
    : ['funded', 'awaiting_delivery', 'purchase_in_progress'].includes(trade.status)
      ? trade.delivery_deadline_at
      : trade.status === 'awaiting_confirmation'
        ? trade.confirmation_deadline_at
        : null;

  const payout = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await releasePayout({ trade, user, note: 'آزادسازی از پنل مدیریت' });
      await load();
      setNotice('رکوردهای مالی این معامله آزاد شد.');
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/trades" className="text-[11px] font-medium text-primary hover:underline">
          ← بازگشت به معاملات
        </Link>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground">شناسه یکتای معامله</p>
            <p className="font-heading text-[15px] font-bold text-foreground">{trade.trade_code}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {serviceName(trade.service)} · سفارش {trade.order_code} · {jalaliDateTime(trade.created_date)}
            </p>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-muted-foreground">مبلغ معامله</p>
            <p className="font-heading text-lg font-bold text-foreground">{toman(trade.price)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Countdown deadline={deadline} label="مهلت مرحله فعلی" />
          <StatusBadge label={trade.escrow_mode === 'enabled' ? 'امانت‌گذاری فعال' : 'پرداخت مستقیم بین طرفین'} tone={trade.escrow_mode === 'enabled' ? 'success' : 'warning'} />
          <StatusBadge label={`تسویه: ${trade.payout_status === 'released' ? 'آزادشده' : trade.payout_status === 'pending' ? 'در انتظار درگاه' : trade.payout_status === 'blocked' ? 'متوقف' : 'ثبت‌نشده'}`} tone={trade.payout_status === 'released' ? 'success' : 'muted'} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/50 p-3 text-[11px]">
            <p className="mb-1 font-semibold text-foreground">خریدار</p>
            <p className="text-muted-foreground">{trade.buyer_display || '—'}</p>
            <p className="mt-1 text-muted-foreground">پرداختی: {toman(trade.buyer_pays)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-[11px]">
            <p className="mb-1 font-semibold text-foreground">فروشنده</p>
            <p className="text-muted-foreground">{trade.seller_display || '—'}</p>
            <p className="mt-1 text-muted-foreground">دریافتی: {toman(trade.net_to_seller)}</p>
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-border p-3 text-[11px]">
          <p className="font-heading text-[12px] font-semibold text-foreground">تفکیک مالی</p>
          <Line label="قیمت معامله" value={toman(trade.price)} />
          <Line label={`کارمزد خریدار (${percent(JSON.parse(trade.fee_snapshot || '{}')?.buy_rule?.rate_percent || 0)})`} value={toman(trade.buyer_fee)} />
          <Line label={`کارمزد فروشنده (${percent(JSON.parse(trade.fee_snapshot || '{}')?.sell_rule?.rate_percent || 0)})`} value={toman(trade.seller_fee)} />
          <Line label="کارمزد کل پلتفرم" value={toman(trade.platform_fee_total)} />
          <Line label="مبلغ اعتبار" value={toman(trade.credit_amount)} />
          <Line label="روش تحویل" value={deliveryName(trade.delivery_method)} />
        </div>

        {trade.terms ? (
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="mb-1 font-heading text-[12px] font-semibold text-foreground">شرایط توافق‌شده</p>
            <p className="text-[11px] leading-6 text-muted-foreground">{trade.terms}</p>
          </div>
        ) : null}

        <div className="flex items-start gap-2 rounded-xl border border-border p-3">
          <Fingerprint className="mt-0.5 h-4 w-4 text-primary" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-foreground">هش قرارداد</p>
            <p className="truncate text-[10px] text-muted-foreground" dir="ltr">{trade.contract_hash}</p>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              هش از شرایط معامله ساخته شده و تغییر شرایط، هش را تغییر می‌دهد. انتقال به بلاک‌چین هنوز فعال نیست.
            </p>
          </div>
        </div>

        {trade.dispute_reason ? (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] leading-6 text-rose-700">
            <span className="font-semibold">اختلاف: </span>
            {trade.dispute_reason}
            {trade.resolution_note ? ` — نتیجه: ${trade.resolution_note}` : ''}
          </div>
        ) : null}

        {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

        {!isAuthed ? (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            برای انجام اقدام روی معامله وارد حساب کاربری شوید.
          </p>
        ) : (
          <TradeActionPanel trade={trade} user={user} profile={profile} settings={settings} onDone={load} />
        )}

        {isAdmin && trade.status === 'settled' && trade.payout_status === 'pending' ? (
          <Button variant="outline" className="gap-1.5" disabled={busy} onClick={payout}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            آزادسازی وجه (نیازمند درگاه پرداخت)
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="font-heading text-sm font-bold text-foreground">سابقه رویدادها</p>
        <TradeTimeline events={events} />
      </div>

      <div className="space-y-2">
        <p className="font-heading text-sm font-bold text-foreground">شواهد و مستندات</p>
        {isAuthed ? <EvidencePanel trade={trade} user={user} profile={profile} onAdded={load} /> : null}
      </div>

      <p className="text-[10px] leading-5 text-muted-foreground">
        تعداد مستندات ثبت‌شده: {num(trade.evidence_count)} · مهلت‌ها سمت سرور تعیین می‌شوند و در صورت انقضا، تسویه خودکار متوقف و
        اختلاف ثبت می‌شود.
      </p>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}