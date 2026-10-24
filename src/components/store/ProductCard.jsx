import { Link } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import StatusBadge from '@/components/StatusBadge';
import { PRODUCT_STATUSES } from '@/lib/credit';
import { num, toman } from '@/lib/format';

export default function ProductCard({ product }) {
  const status = PRODUCT_STATUSES[product.status] || PRODUCT_STATUSES.active;
  const image = product.images?.[0];

  return (
    <Link
      to={`/store/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="relative h-32 w-full bg-muted">
        {image ? (
          <Image src={image} alt={product.title} className="h-32 w-full" fittingType="fill" />
        ) : (
          <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 text-xs text-muted-foreground">
            بدون تصویر
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          {product.is_demo ? <StatusBadge label="DEMO" tone="warning" /> : null}
          <StatusBadge label={status.label} tone={status.tone} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="line-clamp-2 font-heading text-[13px] font-semibold leading-6 text-foreground">{product.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {product.category} {product.seller_name ? `· ${product.seller_name}` : ''}
        </p>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="font-heading text-sm font-bold text-foreground">{toman(product.price_retail)}</p>
            {product.price_wholesale ? (
              <p className="text-[10px] text-muted-foreground">عمده: {num(product.price_wholesale)} تومان از {num(product.min_wholesale_qty)} عدد</p>
            ) : null}
          </div>
          <span className="text-[10px] text-muted-foreground">موجودی {num(product.stock)}</span>
        </div>
      </div>
    </Link>
  );
}