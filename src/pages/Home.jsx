import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import OrderCard from '@/components/orders/OrderCard';
import EmptyState from '@/components/EmptyState';
import { EXTERNAL_CONNECTIONS, SERVICES } from '@/lib/credit';
import { num, toman } from '@/lib/format';
import usePlatformSettings from '@/hooks/usePlatformSettings';
import useCurrentUser from '@/hooks/useCurrentUser';

const STEPS = [
  { title: 'ثبت سفارش', text: 'سرویس، مبلغ اعتبار، قیمت، مهلت و شرایط معامله را ثبت می‌کنید.' },
  { title: 'تطبیق و قرارداد', text: 'طرف مقابل سفارش را می‌پذیرد و قرارداد با شناسه یکتا و هش قرارداد ساخته می‌شود.' },
  { title: 'پرداخت و تحویل', text: 'پرداخت مستند می‌شود، فروشنده خرید را انجام می‌دهد و شواهد ثبت می‌گردد.' },
  { title: 'تأیید و تسویه', text: 'خریدار تأیید می‌کند؛ رکوردهای مالی در دفترکل ثبت و تسویه طبق قواعد انجام می‌شود.' }
];

export default function Home() {
  const { settings } = usePlatformSettings();
  const { isAuthed, isAdmin } = useCurrentUser();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({ orders: 0, trades: 0, products: 0 });

  useEffect(() => {
    base44.entities.Order.filter({ status: 'listed' }, { sort: '-created_date', limit: 4 })
      .then((res) => setOrders(res?.items || []))
      .catch(() => setOrders([]));
    base44.entities.Product.filter({ status: 'active' }, { sort: '-created_date', limit: 3 })
      .then((res) => setProducts(res?.items || []))
      .catch(() => setProducts([]));
    Promise.all([
      base44.entities.Order.count({ status: 'listed' }).catch(() => 0),
      base44.entities.Trade.count({}).catch(() => 0),
      base44.entities.Product.count({ status: 'active' }).catch(() => 0)
    ]).then(([orderCount, tradeCount, productCount]) => setCounts({ orders: orderCount, trades: tradeCount, products: productCount }));
  }, []);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-primary px-5 py-8 text-primary-foreground sm:px-8 sm:py-10">
        <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-accent/25 blur-3xl" aria-hidden />
        <div className="relative space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1 text-[11px] font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            معامله اعتبار با قرارداد شفاف و سابقه کامل
          </span>
          <h1 className="font-heading text-2xl font-bold leading-9 sm:text-3xl sm:leading-[2.75rem]">
            اعتبار خرید دیجی‌پی، اسنپ‌پی، ترب‌پی و باسلام را امن بفروش و بخر
          </h1>
          <p className="max-w-xl text-[13px] leading-7 text-primary-foreground/80">
            بازار اعتبار با کارمزد شفاف، مهلت‌های کنترل‌شده، مستندات معامله و دفترکل قابل ردیابی. هر تغییر وضعیت با رویداد ثبت‌شده
            همراه است و تسویه فقط با تأیید خریدار و اتصال درگاه پرداخت انجام می‌شود.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link to="/buy">
                <ArrowDownLeft className="h-4 w-4" />
                خرید اعتبار
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1.5 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/sell">
                <ArrowUpRight className="h-4 w-4" />
                فروش اعتبار
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="rounded-xl bg-primary-foreground/10 px-2 py-2">
              <p className="font-heading text-base font-bold">{num(counts.orders)}</p>
              <p className="text-[10px] text-primary-foreground/70">آگهی فعال</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 px-2 py-2">
              <p className="font-heading text-base font-bold">{num(counts.trades)}</p>
              <p className="text-[10px] text-primary-foreground/70">معامله ثبت‌شده</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 px-2 py-2">
              <p className="font-heading text-base font-bold">{num(counts.products)}</p>
              <p className="text-[10px] text-primary-foreground/70">کالای فروشگاه</p>
            </div>
          </div>
        </div>
      </section>

      {settings.ton_enabled ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-[11px] leading-6 text-sky-900">
          <span className="font-semibold">پرداخت با شبکه TON:</span> کنار هر مبلغ تومانی، معادل تون آن هم نمایش داده می‌شود؛
          پرداخت مستقیم بین طرفین با هش تراکنش مستند و پس از تأیید خریدار تسویه می‌گردد.
          {isAdmin ? ' نرخ تبدیل و آدرس کیف پول را در پنل مدیریت تنظیم کنید.' : ''}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-foreground">آخرین آگهی‌های بازار</h2>
          <Link to="/market" className="text-[11px] font-medium text-primary hover:underline">
            مشاهده مارکت‌لیست
          </Link>
        </div>
        {orders.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="هنوز آگهی فعالی ثبت نشده"
            description="اولین سفارش خرید یا فروش اعتبار را ثبت کنید تا بازار شکل بگیرد."
            action={
              <Button asChild size="sm">
                <Link to={isAuthed ? '/sell' : '/market'}>شروع کنید</Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-base font-bold text-foreground">چرخه معامله</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-3.5">
              <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 font-heading text-xs font-bold text-primary">
                {num(index + 1)}
              </span>
              <p className="font-heading text-[13px] font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-foreground">سرویس‌های تحت پوشش</h2>
          <Link to="/smart-contract" className="text-[11px] font-medium text-primary hover:underline">
            قواعد اسمارت کانترکت
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SERVICES.map((service) => (
            <div key={service.id} className={`rounded-2xl bg-gradient-to-br ${service.color} p-3 text-white`}>
              <p className="font-heading text-sm font-bold">{service.name}</p>
              <p className="text-[10px] text-white/80">{service.category}</p>
            </div>
          ))}
        </div>
      </section>

      {products.length ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-bold text-foreground">از فروشگاه</h2>
            <Link to="/store" className="text-[11px] font-medium text-primary hover:underline">
              همه کالاها
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {products.map((product) => (
              <Link key={product.id} to={`/store/${product.id}`} className="rounded-2xl border border-border bg-card p-3.5 transition hover:border-primary/40">
                <p className="line-clamp-2 text-[13px] font-medium text-foreground">{product.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{product.category}</p>
                <p className="mt-2 font-heading text-sm font-bold text-foreground">{toman(product.price_retail)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}