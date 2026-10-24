import { useState } from 'react';
import { ImagePlus, Loader2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image } from '@/components/ui/image';
import { saveProduct } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/format';

const INITIAL = {
  title: '',
  description: '',
  category: 'لوازم دیجیتال',
  brand: '',
  unit: 'عدد',
  price_retail: '',
  price_wholesale: '',
  min_wholesale_qty: '10',
  stock: '0',
  delivery_type: 'digital',
  delivery_note: '',
  status: 'active',
  images: []
};

export default function ProductForm({ user, profile, product, onSaved, onCancel }) {
  const [values, setValues] = useState(() =>
    product
      ? {
          ...INITIAL,
          ...product,
          price_retail: String(product.price_retail || ''),
          price_wholesale: product.price_wholesale ? String(product.price_wholesale) : '',
          min_wholesale_qty: String(product.min_wholesale_qty || 10),
          stock: String(product.stock || 0)
        }
      : INITIAL
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const update = (key) => (event) => setValues((prev) => ({ ...prev, [key]: event.target.value }));

  const onPickImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setError('');
    setUploading(true);
    try {
      const room = Math.max(0, 3 - (values.images?.length || 0));
      const uploaded = [];
      for (const file of files.slice(0, room)) {
        const res = await base44.integrations.Core.UploadPublicFile({ file });
        if (res?.file_url) uploaded.push(res.file_url);
      }
      setValues((prev) => ({ ...prev, images: [...(prev.images || []), ...uploaded] }));
    } catch {
      setError('بارگذاری تصویر انجام نشد.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (src) =>
    setValues((prev) => ({ ...prev, images: (prev.images || []).filter((item) => item !== src) }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const saved = await saveProduct({
        product,
        user,
        profile,
        values: {
          ...values,
          price_retail: parseAmount(values.price_retail),
          price_wholesale: parseAmount(values.price_wholesale),
          min_wholesale_qty: parseAmount(values.min_wholesale_qty),
          stock: parseAmount(values.stock)
        }
      });
      onSaved?.(saved);
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <p className="font-heading text-sm font-semibold text-foreground">{product ? 'ویرایش کالا' : 'ثبت کالای جدید'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>نام کالا</Label>
          <Input value={values.title} onChange={update('title')} placeholder="مثلاً گیفت‌کارت استیم ۲۰ دلاری" />
        </div>
        <div className="space-y-1.5">
          <Label>دسته</Label>
          <Input value={values.category} onChange={update('category')} />
        </div>
        <div className="space-y-1.5">
          <Label>برند</Label>
          <Input value={values.brand} onChange={update('brand')} />
        </div>
        <div className="space-y-1.5">
          <Label>قیمت خرده‌فروشی (تومان)</Label>
          <Input inputMode="numeric" value={values.price_retail} onChange={update('price_retail')} />
        </div>
        <div className="space-y-1.5">
          <Label>قیمت عمده (تومان)</Label>
          <Input inputMode="numeric" value={values.price_wholesale} onChange={update('price_wholesale')} placeholder="اختیاری" />
        </div>
        <div className="space-y-1.5">
          <Label>حداقل تعداد عمده</Label>
          <Input inputMode="numeric" value={values.min_wholesale_qty} onChange={update('min_wholesale_qty')} />
        </div>
        <div className="space-y-1.5">
          <Label>موجودی</Label>
          <Input inputMode="numeric" value={values.stock} onChange={update('stock')} />
        </div>
        <div className="space-y-1.5">
          <Label>نوع تحویل</Label>
          <select value={values.delivery_type} onChange={update('delivery_type')} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="digital">دیجیتال</option>
            <option value="physical">فیزیکی</option>
            <option value="service">خدمات</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>وضعیت</Label>
          <select value={values.status} onChange={update('status')} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
            <option value="active">فعال</option>
            <option value="inactive">غیرفعال</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>توضیحات</Label>
          <Textarea rows={3} value={values.description} onChange={update('description')} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>تصاویر کالا</Label>
          <div className="flex flex-wrap items-center gap-2">
            {(values.images || []).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => removeImage(src)}
                className="group relative h-16 w-16 overflow-hidden rounded-xl border border-border"
                title="حذف تصویر"
              >
                <Image src={src} alt="تصویر کالا" className="h-16 w-16" fittingType="fill" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-[9px] text-white">حذف</span>
              </button>
            ))}
            {(values.images || []).length < 3 ? (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-[9px] text-muted-foreground transition hover:border-primary/50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                <span>افزودن</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPickImages} />
              </label>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground">حداکثر ۳ تصویر برای نمایش در فروشگاه.</p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>توضیح تحویل</Label>
          <Input value={values.delivery_note} onChange={update('delivery_note')} placeholder="مثلاً ارسال کد در همان روز کاری" />
        </div>
      </div>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          ذخیره کالا
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            انصراف
          </Button>
        ) : null}
      </div>
    </form>
  );
}