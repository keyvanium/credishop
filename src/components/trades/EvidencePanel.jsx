import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Lock, Paperclip, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import StatusBadge from '@/components/StatusBadge';
import { addEvidence, EVIDENCE_KINDS, EVIDENCE_VISIBILITY } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { jalaliDateTime } from '@/lib/format';

export default function EvidencePanel({ trade, user, profile, onAdded }) {
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState('receipt');
  const [visibility, setVisibility] = useState('shared');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await base44.entities.Evidence.filter({ trade_id: trade.id }, { sort: '-created_date', limit: 50 });
      setItems(res?.items || []);
    } catch {
      setItems([]);
    }
  }, [trade.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!file) {
      setError('ابتدا فایل مستند را انتخاب کنید.');
      return;
    }
    setBusy(true);
    try {
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
      await addEvidence({
        trade,
        user,
        profile,
        file: { file_uri: uploaded.file_uri, name: file.name, size: file.size },
        kind,
        title: title || file.name,
        description,
        visibility
      });
      setFile(null);
      setTitle('');
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
      await onAdded?.();
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openFile = async (item) => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: item.file_uri, expires_in: 300 });
      window.open(signed_url, '_blank', 'noopener');
    } catch {
      setError('امکان باز کردن فایل وجود ندارد.');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
          <Paperclip className="h-4 w-4" />
          ثبت مستند و شاهد
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>نوع مستند</Label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              {EVIDENCE_KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>سطح دسترسی</Label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              {EVIDENCE_VISIBILITY.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>عنوان</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً رسید انتقال وجه" />
          </div>
          <div className="space-y-1.5">
            <Label>فایل</Label>
            <Input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        </div>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="توضیح کوتاه درباره این مستند" />
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">فایل‌ها به‌صورت خصوصی ذخیره می‌شوند و فقط با مجوز دسترسی باز می‌شوند.</p>
          <Button type="submit" size="sm" disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            بارگذاری
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.owner_name} · {EVIDENCE_KINDS.find((k) => k.id === item.kind)?.name || item.kind} · {jalaliDateTime(item.created_at || item.created_date)}
                </p>
                {item.description ? <p className="text-[11px] text-muted-foreground">{item.description}</p> : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <StatusBadge label={item.visibility === 'shared' ? 'مشترک' : item.visibility === 'private' ? 'خصوصی' : 'مخصوص مدیر'} tone={item.visibility === 'shared' ? 'info' : 'muted'} />
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]" onClick={() => openFile(item)}>
                  <Lock className="h-3 w-3" />
                  مشاهده
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
            هنوز مستندی ثبت نشده است.
          </p>
        )}
      </div>
    </div>
  );
}