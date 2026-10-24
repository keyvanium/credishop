import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Search, Store as StoreIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/EmptyState';
import ProductCard from '@/components/store/ProductCard';
import ProductForm from '@/components/store/ProductForm';
import StatusBadge from '@/components/StatusBadge';
import { PRODUCT_STATUSES } from '@/lib/credit';
import { num, toman } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';

const CATEGORIES = ['همه', 'لوازم دیجیتال', 'گیفت‌کارت', 'بسته اعتبار', 'خدمات'];

export default function Store() {
  const { user, profile, isAuthed, signIn } = useCurrentUser();
  const [products, setProducts] = useState([]);
  const [mine, setMine] = useState([]);
  const [tab, setTab] = useState('browse');
  const [category, setCategory] = useState('همه');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filter = { status: 'active' };
      if (category !== 'همه') filter.category = category;
      if (query) filter.title = { $regex: query };
      const res = await base44.entities.Product.filter(filter, { sort: '-created_date', limit: 24 });
      setProducts(res?.items || []);
      if (user?.id) {
        const own = await base44.entities.Product.filter({ seller_id: user.id }, { sort: '-created_date', limit: 50 });
        setMine(own?.items || []);
      } else {
        setMine([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [category, query, user]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">فروشگاه</h1>
          <p className="text-[12px] text-muted-foreground">خرید خرده و عمده کالا و خدمات، با کمیسیون شفاف و وضعیت تحویل قابل پیگیری</p>
        </div>
        {isAuthed ? (
          <Button size="sm" className="gap-1.5" onClick={() => { setTab('mine'); setShowForm(true); }}>
            <Plus className="h-4 w-4" />
            ثبت کالا
          </Button>
        ) : null}
      </header>

      <div className="flex gap-1.5">
        {[
          { id: 'browse', label: 'همه کالاها' },
          { id: 'mine', label: 'کالاهای من' }
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

      {tab === 'browse' ? (
        <>
          <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(search.trim());
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جست‌وجوی کالا" className="pr-9" />
              </div>
              <Button type="submit" size="sm" variant="outline">جست‌وجو</Button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                    category === item ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {loading ? <p className="text-xs text-muted-foreground">در حال بارگذاری کالاها…</p> : null}
          {!loading && !products.length ? (
            <EmptyState
              title="کالایی یافت نشد"
              description="فروشگاه در حال شکل‌گیری است؛ می‌توانید اولین کالای خود را ثبت کنید."
              icon={StoreIcon}
              action={isAuthed ? <Button size="sm" onClick={() => { setTab('mine'); setShowForm(true); }}>ثبت کالا</Button> : null}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {!isAuthed ? (
            <EmptyState
              title="برای فروش کالا وارد شوید"
              description="کالاها به فروشنده واقعی گره می‌خورند تا سفارش، موجودی و تحویل قابل پیگیری باشد."
              action={<Button size="sm" onClick={signIn}>ورود</Button>}
            />
          ) : (
            <>
              {showForm ? (
                <ProductForm
                  user={user}
                  profile={profile}
                  onSaved={async () => { setShowForm(false); await load(); }}
                  onCancel={() => setShowForm(false)}
                />
              ) : (
                <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" />
                  ثبت کالای جدید
                </Button>
              )}

              {mine.length ? (
                mine.map((product) => {
                  const status = PRODUCT_STATUSES[product.status] || PRODUCT_STATUSES.active;
                  return (
                    <div key={product.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3.5">
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{product.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {toman(product.price_retail)} · موجودی {num(product.stock)} · فروش {num(product.sales_count)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={status.label} tone={status.tone} />
                        <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={async () => {
                          await base44.entities.Product.update(product.id, { status: product.status === 'active' ? 'inactive' : 'active' });
                          await load();
                        }}>
                          {product.status === 'active' ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                  هنوز کالایی ثبت نکرده‌اید.
                </p>
              )}
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Loader2 className="h-3 w-3" />
                کالاهای نمونه با برچسب DEMO مشخص شده‌اند و قابل سفارش نیستند.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}