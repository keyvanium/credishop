import { useCallback, useEffect, useState } from 'react';
import { Headphones, Loader2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import EmptyState from '@/components/EmptyState';
import SignInPrompt from '@/components/SignInPrompt';
import StatusBadge from '@/components/StatusBadge';
import { TICKET_STATUSES } from '@/lib/credit';
import { closeTicket, createTicket, replyTicket } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { jalaliDateTime } from '@/lib/format';
import useCurrentUser from '@/hooks/useCurrentUser';
import usePlatformSettings from '@/hooks/usePlatformSettings';

const CATEGORIES = [
  { id: 'trade', label: 'معامله' },
  { id: 'payment', label: 'پرداخت' },
  { id: 'account', label: 'حساب کاربری' },
  { id: 'store', label: 'فروشگاه' },
  { id: 'other', label: 'سایر' }
];

export default function Support() {
  const { user, profile, isAuthed, isAdmin, signIn } = useCurrentUser();
  const { settings } = usePlatformSettings();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ subject: '', category: 'trade', message: '' });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const query = isAdmin ? {} : { user_id: user.id };
      const res = await base44.entities.SupportTicket.filter(query, { sort: '-updated_date', limit: 50 });
      setTickets(res?.items || []);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  const loadMessages = useCallback(async (ticketId) => {
    if (!ticketId) return;
    const res = await base44.entities.SupportMessage.filter({ ticket_id: ticketId }, { sort: 'created_date', limit: 100 });
    setMessages(res?.items || []);
  }, []);

  useEffect(() => {
    loadTickets().catch(() => setLoading(false));
  }, [loadTickets]);

  useEffect(() => {
    if (selected) loadMessages(selected.id).catch(() => setMessages([]));
  }, [selected, loadMessages]);

  const submitTicket = async (event) => {
    event.preventDefault();
    setError('');
    setBusy('new');
    try {
      const ticket = await createTicket({ user, profile, subject: form.subject, category: form.category, message: form.message });
      setForm({ subject: '', category: 'trade', message: '' });
      await loadTickets();
      setSelected(ticket);
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setError('');
    setBusy('reply');
    try {
      await replyTicket({ ticket: selected, user, profile, body: reply });
      setReply('');
      await Promise.all([loadMessages(selected.id), loadTickets()]);
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const close = async () => {
    if (!selected) return;
    setBusy('close');
    try {
      await closeTicket({ ticket: selected, user });
      await loadTickets();
      setSelected({ ...selected, status: 'closed' });
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  if (!isAuthed) return <SignInPrompt title="پشتیبانی" description="برای ثبت تیکت و پیگیری پاسخ‌ها وارد شوید." onSignIn={signIn} />;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">پشتیبانی</h1>
        <p className="text-[12px] text-muted-foreground">
          ساعات پاسخ‌گویی: {settings.support_hours} — تیکت‌های معاملاتی به پرونده معامله متصل می‌شوند.
        </p>
      </header>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          <form onSubmit={submitTicket} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="font-heading text-sm font-semibold text-foreground">تیکت جدید</p>
            <div className="space-y-1.5">
              <Label>موضوع</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="مثلاً تأخیر در تحویل اعتبار" />
            </div>
            <div className="space-y-1.5">
              <Label>دسته</Label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>پیام</Label>
              <Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="جزئیات مشکل یا پرسش خود را بنویسید." />
            </div>
            <Button type="submit" size="sm" disabled={busy === 'new'} className="gap-1.5">
              {busy === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              ثبت تیکت
            </Button>
          </form>

          <div className="space-y-2">
            {loading ? <p className="text-xs text-muted-foreground">در حال بارگذاری…</p> : null}
            {!loading && !tickets.length ? <EmptyState title="تیکتی ندارید" description="در صورت بروز مشکل، تیکت جدید ثبت کنید." icon={Headphones} /> : null}
            {tickets.map((ticket) => {
              const status = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.open;
              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className={`w-full space-y-1 rounded-2xl border px-3.5 py-2.5 text-right transition ${
                    selected?.id === ticket.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-foreground">{ticket.subject}</p>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {ticket.ticket_code} · {jalaliDateTime(ticket.updated_date || ticket.created_date)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-heading text-[13px] font-semibold text-foreground">{selected.subject}</p>
                  <p className="text-[10px] text-muted-foreground">{selected.ticket_code} · {selected.user_name}</p>
                </div>
                {selected.status !== 'closed' ? (
                  <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={close} disabled={busy === 'close'}>
                    بستن تیکت
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">{selected.user_name} · {jalaliDateTime(selected.created_date)}</p>
                  <p className="mt-1 text-[11px] leading-6 text-foreground">{selected.message}</p>
                </div>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-3 py-2 ${message.author_role === 'admin' ? 'bg-primary/5' : 'bg-muted/60'}`}
                  >
                    <p className="text-[10px] text-muted-foreground">
                      {message.author_name} {message.author_role === 'admin' ? '· پشتیبانی' : ''} · {jalaliDateTime(message.created_date)}
                    </p>
                    <p className="mt-1 text-[11px] leading-6 text-foreground">{message.body}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="space-y-2">
                <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="پاسخ خود را بنویسید" />
                <Button type="submit" size="sm" disabled={busy === 'reply'} className="gap-1.5">
                  {busy === 'reply' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ارسال پاسخ
                </Button>
              </form>
            </>
          ) : (
            <p className="py-10 text-center text-xs text-muted-foreground">برای دیدن گفت‌وگو، یک تیکت را انتخاب کنید.</p>
          )}
        </div>
      </div>
    </div>
  );
}