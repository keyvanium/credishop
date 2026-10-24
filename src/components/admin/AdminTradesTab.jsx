import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { TRADE_STATUSES } from '@/lib/credit';
import { jalaliDateTime, toman } from '@/lib/format';

const FILTERS = [
  { id: 'disputed', label: 'اختلاف‌ها' },
  { id: 'awaiting_confirmation', label: 'در انتظار تأیید' },
  { id: 'purchase_in_progress', label: 'خرید در جریان' },
  { id: 'settled', label: 'تکمیل‌شده' },
  { id: 'refunded', label: 'بازپرداخت' },
  { id: 'all', label: 'همه' }
];

export default function AdminTradesTab() {
  const [status, setStatus] = useState('disputed');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const query = status === 'all' ? {} : { status };
    base44.entities.Trade.filter(query, { sort: '-created_date', limit: 40 })
      .then((res) => active && setRows(res?.items || []))
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setStatus(filter.id)}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-medium transition ${
              status === filter.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-xs text-muted-foreground">در حال بارگذاری…</p> : null}

      {!loading && !rows.length ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          معامله‌ای در این وضعیت وجود ندارد.
        </p>
      ) : null}

      <div className="space-y-2">
        {rows.map((trade) => {
          const statusMeta = TRADE_STATUSES[trade.status] || TRADE_STATUSES.matched;
          return (
            <Link
              key={trade.id}
              to={`/trades/${trade.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3 transition hover:border-primary/40"
            >
              <div className="space-y-1">
                <p className="text-[13px] font-semibold text-foreground">
                  {trade.trade_code} · {trade.service_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {trade.buyer_display} ← {trade.seller_display} · {toman(trade.price)}
                </p>
                {trade.dispute_reason ? (
                  <p className="max-w-lg truncate text-[11px] text-rose-300">دلیل اختلاف: {trade.dispute_reason}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{jalaliDateTime(trade.created_date)}</span>
                <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
              </div>
            </Link>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        تصمیم‌گیری درباره اختلاف، بازپرداخت و آزادسازی وجه در صفحه هر معامله و با ثبت دلیل انجام می‌شود.
      </p>
    </div>
  );
}