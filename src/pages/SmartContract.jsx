import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, BadgeCheck, Blocks, CheckCircle2, Fingerprint, Loader2, Lock, RefreshCw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { TonConnectButton, useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { CONNECTION_STATUS, EXTERNAL_CONNECTIONS, TRADE_FLOW, TRADE_STATUSES } from '@/lib/credit';
import { jalaliDateTime } from '@/lib/format';
import {
  ANCHOR_ADDRESS,
  ANCHOR_FEE_NANOTON,
  TON_CHAIN,
  TON_NETWORK,
  IS_TESTNET,
  TONSCAN_TX,
  anchorComment,
  buildCommentPayload,
  findAnchorTransaction,
  shortAddress
} from '@/lib/ton';
import useCurrentUser from '@/hooks/useCurrentUser';

const RULES = [
  { title: 'انتقال وضعیت فقط با عملیات مجاز', text: 'هر تغییر وضعیت از میان عملیات تعریف‌شده و با نقش مشخص (خریدار، فروشنده، مدیر) انجام می‌شود؛ سایر انتقال‌ها رد می‌شوند.' },
  { title: 'شناسه یکتا و هش قرارداد', text: 'هر معامله شناسه یکتا و هش SHA-256 از شرایط دارد؛ تغییر شرایط، هش را تغییر می‌دهد و قابل ردیابی است.' },
  { title: 'جلوگیری از تأیید و تسویه تکراری', text: 'تأیید خریدار تنها یک‌بار پذیرفته می‌شود و ثبت رکورد مالی برای هر معامله فقط یک‌بار ممکن است.' },
  { title: 'مهلت‌ها و توقف تسویه خودکار', text: 'انقضای مهلت پرداخت، تحویل یا تأیید، معامله را متوقف و وضعیت اختلاف ثبت می‌کند تا بررسی دستی انجام شود.' },
  { title: 'شرط آزادسازی وجه', text: 'تا اتصال و تأیید درگاه پرداخت یا امانت‌داری، هیچ وجهی آزاد یا پرداخت نمی‌شود؛ رکوردها «در انتظار تسویه» می‌مانند.' },
  { title: 'مستندات با دسترسی محدود', text: 'هر مستند سطح دسترسی خود را دارد: خصوصی، مشترک با طرف مقابل یا مخصوص بررسی مدیر.' }
];

const ANCHOR_TONE = {
  none: 'muted',
  pending: 'warning',
  confirmed: 'success',
  failed: 'danger'
};

const ANCHOR_LABEL = {
  none: 'ثبت نشده',
  pending: 'در انتظار تأیید زنجیره',
  confirmed: 'لنگرشده روی TON',
  failed: 'ناموفق'
};

function AnchorActions({ trade, onChanged }) {
  const wallet = useTonWallet();
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [busy, setBusy] = useState('');

  const status = trade.ton_anchor_status || 'none';
  const comment = trade.ton_anchor_comment || anchorComment(trade);

  const anchor = async () => {
    if (!wallet || !address) {
      tonConnectUI.openModal();
      return;
    }
    setBusy('anchor');
    try {
      const payload = buildCommentPayload(comment);
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 600,
        network: TON_CHAIN,
        messages: [
          {
            address: ANCHOR_ADDRESS || address,
            amount: ANCHOR_FEE_NANOTON,
            payload
          }
        ]
      });
      await base44.entities.Trade.update(trade.id, {
        ton_anchor_status: 'pending',
        ton_anchor_comment: comment,
        ton_anchored_by: address
      });
      toast.success('تراکنش لنگر ارسال شد؛ پس از تأیید شبکه وضعیت به‌روز می‌شود.');
      onChanged();
    } catch (error) {
      if (String(error?.message || '').toLowerCase().includes('reject')) {
        toast.info('ارسال تراکنش توسط کیف پول لغو شد.');
      } else {
        toast.error('ارسال تراکنش لنگر ناموفق بود.');
      }
    } finally {
      setBusy('');
    }
  };

  const verify = async () => {
    setBusy('verify');
    try {
      const sender = trade.ton_anchored_by || address;
      const found = await findAnchorTransaction(sender, comment);
      if (!found) {
        toast.info('تراکنش هنوز روی شبکه پیدا نشد؛ چند لحظه دیگر دوباره تلاش کنید.');
        return;
      }
      await base44.entities.Trade.update(trade.id, {
        ton_anchor_status: 'confirmed',
        ton_tx_hash: found.hash,
        ton_anchored_at: new Date().toISOString()
      });
      toast.success('لنگر قرارداد روی زنجیره تأیید شد. 🎉');
      onChanged();
    } catch {
      toast.error('بررسی زنجیره ناموفق بود.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5" onClick={(e) => e.preventDefault()}>
      <StatusBadge label={ANCHOR_LABEL[status] || status} tone={ANCHOR_TONE[status] || 'muted'} />
      {status === 'confirmed' && trade.ton_tx_hash ? (
        <a
          href={TONSCAN_TX(trade.ton_tx_hash)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300 transition hover:bg-emerald-500/20"
        >
          <BadgeCheck className="h-3 w-3" />
          مشاهده در tonscan
        </a>
      ) : null}
      {status !== 'confirmed' ? (
        <button
          onClick={anchor}
          disabled={busy !== ''}
          className="inline-flex items-center gap-1 rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-[10px] font-medium text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
        >
          {busy === 'anchor' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Anchor className="h-3 w-3" />}
          ثبت روی TON
        </button>
      ) : null}
      {status === 'pending' ? (
        <button
          onClick={verify}
          disabled={busy !== ''}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
        >
          {busy === 'verify' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          بررسی تأیید
        </button>
      ) : null}
    </div>
  );
}

export default function SmartContract() {
  const { user, isAuthed, signIn } = useCurrentUser();
  const wallet = useTonWallet();
  const address = useTonAddress();
  const [trades, setTrades] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Trade.filter({ participant_ids: user.id }, { sort: '-created_date', limit: 20 })
      .then((res) => setTrades(res?.items || []))
      .catch(() => setTrades([]));
  }, [user, tick]);

  const refresh = () => setTick((t) => t + 1);

  const connections = useMemo(
    () =>
      EXTERNAL_CONNECTIONS.map((c) =>
        c.id === 'ton_network' ? { ...c, status: 'connected', note: `اتصال کیف پول و لنگر قراردادها روی شبکه ${TON_NETWORK === 'mainnet' ? 'اصلی' : 'آزمایشی'} TON` } : c
      ),
    []
  );

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">اسمارت کانترکت معامله</h1>
        <p className="max-w-2xl text-[12px] leading-6 text-muted-foreground">
          قرارداد معامله در پلتفرم با وضعیت‌های صریح، رویدادهای ثبت‌شده و شرایط غیرقابل‌ابهام اجرا می‌شود. هش هر قرارداد را
          می‌توانید روی شبکه TON لنگر کنید تا اثبات تغییرناپذیری آن عمومی و قابل استعلام شود.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-sky-400/20 bg-sky-500/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
            <Wallet className="h-4 w-4 text-sky-400" />
            اتصال به شبکه TON
            <StatusBadge label={TON_NETWORK === 'mainnet' ? 'مین‌نت' : 'تست‌نت'} tone="info" />
          </p>
          <TonConnectButton />
        </div>
        {wallet ? (
          <p className="text-[11px] text-muted-foreground" dir="ltr">
            <span className="font-mono text-sky-300">{shortAddress(address)}</span>
          </p>
        ) : (
          <p className="text-[11px] leading-6 text-muted-foreground">
            کیف پول TON خود را وصل کنید (Tonkeeper، MyTonWallet یا هر کیف پول سازگار با TonConnect)؛ سپس برای هر قرارداد
            دکمه «ثبت روی TON» ظاهر می‌شود و هش قرارداد در کامنت یک تراکنش روی زنجیره ثبت می‌گردد.
            {IS_TESTNET ? ' در تست‌نت می‌توانید با تون رایگان فاست تمرین کنید.' : ''}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <p className="font-heading text-sm font-bold text-foreground">چرخه وضعیت‌ها</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {TRADE_FLOW.map((status, index) => (
            <span key={status} className="flex items-center gap-1.5">
              <StatusBadge label={TRADE_STATUSES[status].label} tone={TRADE_STATUSES[status].tone} />
              {index < TRADE_FLOW.length - 1 ? <span className="text-muted-foreground">←</span> : null}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground">وضعیت‌های پایانی جایگزین:</span>
          {['cancelled', 'disputed', 'refunded'].map((status) => (
            <StatusBadge key={status} label={TRADE_STATUSES[status].label} tone={TRADE_STATUSES[status].tone} />
          ))}
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        {RULES.map((rule) => (
          <div key={rule.title} className="space-y-1 rounded-2xl border border-border bg-card p-3.5">
            <p className="flex items-center gap-1.5 font-heading text-[13px] font-semibold text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {rule.title}
            </p>
            <p className="text-[11px] leading-6 text-muted-foreground">{rule.text}</p>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
          <Fingerprint className="h-4 w-4" />
          قراردادهای من
        </p>
        {!isAuthed ? (
          <p className="text-[11px] text-muted-foreground">
            برای دیدن هش قرارداد معاملات خود{' '}
            <button className="font-medium text-primary underline" onClick={signIn}>وارد شوید</button>.
          </p>
        ) : trades.length ? (
          <div className="space-y-2">
            {trades.map((trade) => (
              <Link key={trade.id} to={`/trades/${trade.id}`} className="block rounded-xl bg-muted/50 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium text-foreground">{trade.trade_code}</p>
                  <StatusBadge label={TRADE_STATUSES[trade.status]?.label || trade.status} tone={TRADE_STATUSES[trade.status]?.tone || 'muted'} />
                </div>
                <p className="mt-1 truncate text-[10px] text-muted-foreground" dir="ltr">{trade.contract_hash}</p>
                <p className="text-[10px] text-muted-foreground">{jalaliDateTime(trade.created_date)}</p>
                <AnchorActions trade={trade} onChanged={refresh} />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">هنوز قراردادی برای شما ثبت نشده است.</p>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
          <Blocks className="h-4 w-4" />
          اتصالات بیرونی
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {connections.map((connection) => (
            <div key={connection.id} className="flex items-start justify-between gap-2 rounded-xl bg-muted/40 p-3">
              <div className="space-y-0.5">
                <p className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                  {connection.status === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  {connection.name}
                </p>
                <p className="text-[10px] leading-5 text-muted-foreground">{connection.note}</p>
              </div>
              <StatusBadge label={CONNECTION_STATUS[connection.status].label} tone={CONNECTION_STATUS[connection.status].tone} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
