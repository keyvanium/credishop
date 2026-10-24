import { useCallback, useEffect, useState } from 'react';
import { Filter, Loader2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/EmptyState';
import OrderCard from '@/components/orders/OrderCard';
import { SERVICES } from '@/lib/credit';
import { num } from '@/lib/format';

const SORTS = [
  { id: 'newest', label: 'جدیدترین', sort: '-created_date' },
  { id: 'credit_desc', label: 'بیشترین اعتبار', sort: '-credit_amount' },
  { id: 'price_asc', label: 'ارزان‌ترین', sort: 'total_price' },
  { id: 'price_desc', label: 'گران‌ترین', sort: '-total_price' }
];

const PAGE_SIZE = 12;

export default function Market() {
  const [side, setSide] = useState('all');
  const [service, setService] = useState('all');
  const [sort, setSort] = useState('newest');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const buildQuery = useCallback(() => {
    const query = { status: 'listed' };
    if (side !== 'all') query.side = side;
    if (service !== 'all') query.service = service;
    if (search) {
      query.$or = [{ order_code: { $regex: search } }, { owner_display: { $regex: search } }, { service_name: { $regex: search } }];
    }
    return query;
  }, [side, service, search]);

  const load = useCallback(
    async ({ append = false } = {}) => {
      setLoading(true);
      try {
        const sortOption = SORTS.find((s) => s.id === sort)?.sort || '-created_date';
        const options = { sort: sortOption, limit: PAGE_SIZE };
        if (append && cursor) options.cursor = cursor;
        const page = await base44.entities.Order.filter(buildQuery(), options);
        const items = page?.items || [];
        setRows((prev) => (append ? [...prev, ...items] : items));
        setCursor(page?.next_cursor || null);
        setHasMore(!!page?.has_more);
        if (!append) {
          const count = await base44.entities.Order.count(buildQuery()).catch(() => items.length);
          setTotal(count);
        }
      } catch {
        if (!append) setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, cursor, sort]
  );

  useEffect(() => {
    setCursor(null);
    load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, service, sort, search]);

  const submitSearch = (event) => {
    event.preventDefault();
    setSearch(query.trim());
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">مارکت‌لیست اعتبار</h1>
          <p className="text-[12px] text-muted-foreground">{num(total)} سفارش فعال — جست‌وجو، فیلتر و مرتب‌سازی زنده</p>
        </div>
        <form onSubmit={submitSearch} className="flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="کد سفارش، کاربر یا سرویس"
              className="pr-9 sm:w-64"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            جست‌وجو
          </Button>
        </form>
      </header>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            سمت:
          </span>
          {[
            { id: 'all', label: 'همه' },
            { id: 'sell', label: 'فروش اعتبار' },
            { id: 'buy', label: 'خرید اعتبار' }
          ].map((item) => (
            <Chip key={item.id} active={side === item.id} onClick={() => setSide(item.id)}>
              {item.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">سرویس:</span>
          <Chip active={service === 'all'} onClick={() => setService('all')}>
            همه
          </Chip>
          {SERVICES.map((item) => (
            <Chip key={item.id} active={service === item.id} onClick={() => setService(item.id)}>
              {item.name}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">مرتب‌سازی:</span>
          {SORTS.map((item) => (
            <Chip key={item.id} active={sort === item.id} onClick={() => setSort(item.id)}>
              {item.label}
            </Chip>
          ))}
        </div>
      </div>

      {loading && !rows.length ? <p className="text-xs text-muted-foreground">در حال بارگذاری آگهی‌ها…</p> : null}

      {!loading && !rows.length ? (
        <EmptyState
          title="سفارشی با این فیلترها یافت نشد"
          description="فیلترها را تغییر دهید یا خودتان اولین سفارش را ثبت کنید."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {hasMore ? (
        <Button variant="outline" className="mx-auto flex gap-2" disabled={loading} onClick={() => load({ append: true })}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          نمایش بیشتر
        </Button>
      ) : null}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}