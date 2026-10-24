import { base44 } from '@/api/base44Client';
import { SERVICES, DELIVERY_METHODS } from '@/lib/credit';

/* ============================ خطاها و ابزارها ============================ */

export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const nowIso = () => new Date().toISOString();
export const addMinutes = (fromIso, minutes) =>
  new Date(new Date(fromIso).getTime() + Number(minutes || 0) * 60000).toISOString();

export function genCode(prefix) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 5).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export async function hashContract(parts) {
  const canonical = Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k]}`)
    .join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const asList = (res) => (Array.isArray(res) ? res : res?.items || []);

/* ============================== پیکربندی ============================== */

export const SETTING_DEFAULTS = {
  payment_gateway_enabled: false,
  ton_enabled: true,
  ton_wallet_address: '',
  ton_rate_toman: 400000,
  escrow_enabled: false,
  blockchain_enabled: true,
  rewards_enabled: true,
  subscription_enabled: false,
  promotion_enabled: false,
  referral_enabled: true,
  listing_window_minutes: 1440,
  default_deadline_minutes: 60,
  confirmation_window_minutes: 60,
  min_credit_amount: 100000,
  max_credit_amount: 500000000,
  min_trade_price: 50000,
  platform_name: 'اعتبارمارکت',
  support_hours: '۹ تا ۱۸ — روزهای کاری',
  pro_monthly_price: 299000,
  pro_yearly_price: 2990000,
  featured_listing_price: 150000,
  referral_reward_points: 50
};

export async function loadSettings() {
  const rows = asList(await base44.entities.PlatformSetting.list('-created_date', 200));
  const out = { ...SETTING_DEFAULTS };
  rows.forEach((row) => {
    if (!row?.key) return;
    if (row.value_type === 'number') out[row.key] = Number(row.value || 0);
    else if (row.value_type === 'boolean') out[row.key] = row.value === 'true' || row.value === '1';
    else if (row.value_type === 'json') {
      try {
        out[row.key] = JSON.parse(row.value || 'null');
      } catch {
        /* مقدار نامعتبر نادیده گرفته می‌شود */
      }
    } else out[row.key] = row.value;
  });
  return out;
}

/* ============================== کارمزدها ============================== */

export async function resolveFeeRule({ side, service }) {
  const rules = asList(await base44.entities.FeeRule.filter({ active: true, side }, { limit: 100 }));
  const applicable = rules.filter(
    (r) => r.scope === 'global' || (r.scope === 'service' && r.service === service)
  );
  if (!applicable.length) return null;
  const score = (r) => (r.scope === 'service' ? 200 : 100) + Number(r.priority || 0);
  return applicable.sort((a, b) => score(b) - score(a))[0];
}

export function computeFeeAmount(rule, base) {
  const amount = Number(base || 0);
  if (!rule || amount <= 0) return 0;
  const rate = Number(rule.rate_percent || 0) / 100;
  let fee = rule.fee_type === 'fixed'
    ? Number(rule.fixed_amount || 0)
    : rule.fee_type === 'percent_plus_fixed'
      ? amount * rate + Number(rule.fixed_amount || 0)
      : amount * rate;
  if (Number(rule.min_fee || 0) > 0) fee = Math.max(fee, Number(rule.min_fee));
  if (Number(rule.max_fee || 0) > 0) fee = Math.min(fee, Number(rule.max_fee));
  return Math.round(fee);
}

export async function quoteFees({ service, price }) {
  const amount = Math.round(Number(price) || 0);
  const [buyRule, sellRule] = await Promise.all([
    resolveFeeRule({ side: 'buy', service }),
    resolveFeeRule({ side: 'sell', service })
  ]);
  const buyer_fee = computeFeeAmount(buyRule, amount);
  const seller_fee = computeFeeAmount(sellRule, amount);
  return {
    price: amount,
    buyer_fee,
    seller_fee,
    platform_fee_total: buyer_fee + seller_fee,
    buyer_pays: amount + buyer_fee,
    net_to_seller: amount - seller_fee,
    buy_rule: buyRule ? { name: buyRule.name, rate_percent: buyRule.rate_percent, fee_type: buyRule.fee_type, min_fee: buyRule.min_fee, max_fee: buyRule.max_fee } : null,
    sell_rule: sellRule ? { name: sellRule.name, rate_percent: sellRule.rate_percent, fee_type: sellRule.fee_type, min_fee: sellRule.min_fee, max_fee: sellRule.max_fee } : null
  };
}

export const unitRate = (creditAmount, price) =>
  Number(creditAmount) > 0 ? Math.round((Number(price) / Number(creditAmount)) * 1000) : 0;

/* ============================== کاربر و پروفایل ============================== */

export async function ensureProfile(user) {
  if (!user?.id) return null;
  const found = asList(await base44.entities.UserProfile.filter({ user_id: user.id }, { limit: 1 }));
  if (found[0]) {
    if (!found[0].referral_code) {
      return await base44.entities.UserProfile.update(found[0].id, { referral_code: genCode('REF') });
    }
    return found[0];
  }
  return await base44.entities.UserProfile.create({
    user_id: user.id,
    full_name: user.full_name || '',
    display_name: user.full_name || (user.email || '').split('@')[0],
    tier: 'bronze',
    status: 'active',
    verification_status: 'unverified',
    referral_code: genCode('REF'),
    last_seen_at: nowIso()
  });
}

export const displayName = (profile, user) =>
  profile?.display_name || profile?.full_name || user?.full_name || (user?.email ? String(user.email).split('@')[0] : 'کاربر');

export const ratingOf = (profile) => {
  const count = Number(profile?.rating_count || 0);
  return count ? Math.round((Number(profile?.rating_sum || 0) / count) * 10) / 10 : 0;
};

export const tierFor = (completedTrades) => {
  const n = Number(completedTrades || 0);
  if (n >= 20) return 'gold';
  if (n >= 5) return 'silver';
  return 'bronze';
};

// بازمحاسبه آمار واقعی کاربر از معاملات ثبت‌شده او
export async function refreshProfileStats(user, profile) {
  if (!user?.id) return profile;
  const [asBuyer, asSeller] = await Promise.all([
    base44.entities.Trade.filter({ buyer_id: user.id }, { limit: 200 }),
    base44.entities.Trade.filter({ seller_id: user.id }, { limit: 200 })
  ]);
  const trades = [...asList(asBuyer), ...asList(asSeller)];
  const settled = trades.filter((t) => t.status === 'settled');
  const disputed = trades.filter((t) => t.status === 'disputed' || t.status === 'refunded');
  const ratingsAsSeller = trades.filter((t) => t.seller_id === user.id && t.buyer_rating);
  const ratingSum = ratingsAsSeller.reduce((s, t) => s + Number(t.buyer_rating || 0), 0);
  const payload = {
    completed_trades: settled.length,
    disputed_trades: disputed.length,
    rating_sum: ratingSum,
    rating_count: ratingsAsSeller.length,
    tier: tierFor(settled.length),
    last_seen_at: nowIso()
  };
  const target = profile || (await ensureProfile(user));
  if (!target) return null;
  return await base44.entities.UserProfile.update(target.id, payload);
}

/* ============================ ماشین وضعیت معامله ============================ */

export const TRADE_ACTIONS = {
  declare_payment: { from: ['awaiting_funding'], to: 'funded', actor: 'buyer', label: 'اعلام پرداخت وجه', requiresEvidence: true },
  acknowledge_payment: { from: ['funded'], to: 'awaiting_delivery', actor: 'seller', label: 'تأیید دریافت وجه' },
  start_delivery: { from: ['awaiting_delivery'], to: 'purchase_in_progress', actor: 'seller', label: 'شروع خرید و تحویل' },
  complete_purchase: { from: ['purchase_in_progress'], to: 'awaiting_confirmation', actor: 'seller', label: 'اعلام اتمام خرید و تحویل', requiresEvidence: true },
  confirm_receipt: { from: ['awaiting_confirmation'], to: 'settled', actor: 'buyer', label: 'تأیید دریافت اعتبار' },
  cancel_trade: { from: ['matched', 'awaiting_funding'], to: 'cancelled', actor: 'both', label: 'لغو معامله پیش از پرداخت' },
  open_dispute: { from: ['funded', 'awaiting_delivery', 'purchase_in_progress', 'awaiting_confirmation'], to: 'disputed', actor: 'both', label: 'ثبت اختلاف' },
  admin_resolve_seller: { from: ['disputed'], to: 'settled', actor: 'admin', label: 'حل اختلاف به نفع فروشنده' },
  admin_refund: { from: ['disputed', 'funded', 'awaiting_delivery', 'purchase_in_progress', 'awaiting_confirmation'], to: 'refunded', actor: 'admin', label: 'بازپرداخت به خریدار' },
  admin_cancel: { from: ['disputed', 'matched', 'awaiting_funding', 'funded'], to: 'cancelled', actor: 'admin', label: 'لغو توسط مدیر' }
};

export const ACTIONS_BY_ROLE = (trade, user) => {
  if (!trade || !user) return [];
  const role = roleOf(trade, user.id);
  const isAdmin = user.role === 'admin';
  return Object.entries(TRADE_ACTIONS)
    .filter(([, def]) => {
      if (!def.from.includes(trade.status)) return false;
      if (def.actor === 'admin') return isAdmin;
      if (!role) return false;
      if (def.actor === 'both') return true;
      return def.actor === role;
    })
    .map(([id, def]) => ({ id, ...def, role: role || 'admin' }));
};

export const roleOf = (trade, userId) => {
  if (!trade || !userId) return null;
  if (trade.buyer_id === userId) return 'buyer';
  if (trade.seller_id === userId) return 'seller';
  return null;
};

export const roleLabel = (role) => (role === 'buyer' ? 'خریدار' : role === 'seller' ? 'فروشنده' : 'مدیر');

async function logTradeEvent(trade, { type, action, from, to, actor, actorRole, note, meta }) {
  return await base44.entities.TradeEvent.create({
    trade_id: trade.id,
    trade_code: trade.trade_code,
    type,
    action: action || null,
    from_status: from || null,
    to_status: to || null,
    actor_id: actor?.id || null,
    actor_name: actor?.name || 'سیستم',
    actor_role: actorRole || 'system',
    note: note || '',
    meta_text: meta ? JSON.stringify(meta) : null,
    participant_ids: trade.participant_ids?.length ? trade.participant_ids : [trade.buyer_id, trade.seller_id].filter(Boolean),
    occurred_at: nowIso()
  });
}

export async function postLedger(entry) {
  return await base44.entities.LedgerEntry.create({
    entry_code: entry.entry_code || genCode('LED'),
    scope: entry.scope || 'user',
    user_id: entry.user_id || null,
    user_display: entry.user_display || null,
    trade_id: entry.trade_id || null,
    trade_code: entry.trade_code || null,
    store_order_id: entry.store_order_id || null,
    store_order_code: entry.store_order_code || null,
    type: entry.type,
    direction: entry.direction,
    amount: Math.round(Number(entry.amount || 0)),
    status: entry.status || 'pending',
    reference: entry.reference || null,
    note: entry.note || '',
    requires_gateway: entry.requires_gateway !== false,
    reversal_of: entry.reversal_of || null,
    posted_at: entry.status === 'posted' ? nowIso() : null
  });
}

export async function tradeLedger(tradeId) {
  return asList(await base44.entities.LedgerEntry.filter({ trade_id: tradeId }, { limit: 100 }));
}

export async function walletSummary(userId) {
  const entries = asList(await base44.entities.LedgerEntry.filter({ user_id: userId }, { sort: '-created_date', limit: 200 }));
  const active = entries.filter((e) => e.status !== 'reversed');
  const sum = (list, dir) => list.filter((e) => e.direction === dir).reduce((s, e) => s + Number(e.amount || 0), 0);
  const posted = active.filter((e) => e.status === 'posted');
  const pending = active.filter((e) => e.status === 'pending');
  return {
    balance: sum(posted, 'credit') - sum(posted, 'debit'),
    pending_credit: sum(pending, 'credit'),
    pending_debit: sum(pending, 'debit'),
    pending_net: sum(pending, 'credit') - sum(pending, 'debit'),
    entries_count: active.length
  };
}

export async function assertNotSettled(trade) {
  if (trade.ledger_state === 'complete') {
    throw new AppError('ALREADY_SETTLED', 'این معامله قبلاً تسویه شده است.', 409);
  }
  const existing = (await tradeLedger(trade.id)).filter((e) => e.status !== 'reversed');
  if (existing.length) {
    throw new AppError('ALREADY_SETTLED', 'برای این معامله قبلاً رکورد مالی ثبت شده است.', 409);
  }
}

/* ============================== سفارش‌ها ============================== */

export function validateOrderInput({ service, side, creditAmount, price, deadlineMinutes, terms, deliveryMethod }, settings) {
  if (!SERVICES.some((s) => s.id === service)) throw new AppError('INVALID_SERVICE', 'سرویس انتخابی معتبر نیست.');
  if (!['buy', 'sell'].includes(side)) throw new AppError('INVALID_SIDE', 'نوع سفارش معتبر نیست.');
  const credit = Number(creditAmount);
  const total = Number(price);
  if (!credit || credit < settings.min_credit_amount || credit > settings.max_credit_amount) {
    throw new AppError('INVALID_AMOUNT', `مبلغ اعتبار باید بین ${settings.min_credit_amount.toLocaleString('fa-IR')} و ${settings.max_credit_amount.toLocaleString('fa-IR')} تومان باشد.`);
  }
  if (!total || total < settings.min_trade_price) {
    throw new AppError('INVALID_PRICE', `قیمت پیشنهادی باید حداقل ${settings.min_trade_price.toLocaleString('fa-IR')} تومان باشد.`);
  }
  const deadline = Number(deadlineMinutes);
  if (!deadline || deadline < 15 || deadline > 1440) {
    throw new AppError('INVALID_DEADLINE', 'مهلت معامله باید بین ۱۵ دقیقه و ۲۴ ساعت باشد.');
  }
  if (!DELIVERY_METHODS.some((d) => d.id === deliveryMethod)) {
    throw new AppError('INVALID_DELIVERY', 'روش انتقال انتخابی معتبر نیست.');
  }
  if (!terms || terms.trim().length < 10) {
    throw new AppError('INVALID_TERMS', 'شرایط معامله را کامل‌تر بنویسید (حداقل ۱۰ نویسه).');
  }
  return { credit, total, deadline };
}

export async function createOrder({ user, profile, service, side, creditAmount, price, deadlineMinutes, terms, deliveryMethod, settings }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای ثبت سفارش باید وارد حساب کاربری خود شوید.', 401);
  const { credit, total, deadline } = validateOrderInput({ service, side, creditAmount, price, deadlineMinutes, terms, deliveryMethod }, settings);

  const duplicates = asList(
    await base44.entities.Order.filter({ owner_id: user.id, service, side, status: 'listed' }, { limit: 20 })
  ).filter((o) => Number(o.credit_amount) === credit && Number(o.total_price) === total);
  if (duplicates.length) {
    throw new AppError('DUPLICATE_ORDER', 'سفارش فعالی با همین سرویس، مبلغ و قیمت دارید. برای جلوگیری از سفارش تکراری، سفارش قبلی را ویرایش یا لغو کنید.', 409);
  }

  const fees = await quoteFees({ service, price: total });
  const now = nowIso();
  const serviceMeta = SERVICES.find((s) => s.id === service);
  const order = await base44.entities.Order.create({
    order_code: genCode(side === 'buy' ? 'BUY' : 'SEL'),
    side,
    service,
    service_name: serviceMeta?.name || service,
    credit_amount: credit,
    total_price: total,
    unit_rate: unitRate(credit, total),
    deadline_minutes: deadline,
    terms: terms.trim(),
    delivery_method: deliveryMethod,
    status: 'listed',
    owner_id: user.id,
    owner_display: displayName(profile, user),
    owner_rating: ratingOf(profile),
    owner_completed_trades: Number(profile?.completed_trades || 0),
    owner_verification: profile?.verification_status || 'unverified',
    fee_preview: side === 'sell' ? fees.seller_fee : fees.buyer_fee,
    listing_expires_at: addMinutes(now, settings.listing_window_minutes || 1440),
    featured: false
  });
  return { order, fees };
}

export async function cancelOrder({ order, user, reason }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای این عملیات باید وارد حساب کاربری شوید.', 401);
  if (order.owner_id !== user.id && user.role !== 'admin') throw new AppError('FORBIDDEN', 'فقط صاحب سفارش می‌تواند آن را لغو کند.', 403);
  if (['matched', 'cancelled', 'expired'].includes(order.status)) {
    throw new AppError('INVALID_STATE', 'در وضعیت فعلی امکان لغو سفارش وجود ندارد.', 409);
  }
  return await base44.entities.Order.update(order.id, {
    status: 'cancelled',
    cancelled_reason: reason || 'لغو توسط کاربر'
  });
}

// سفارش‌های آگهی‌شده‌ای که معامله فعال دارند توسط صاحب سفارش به وضعیت «تطبیق‌شده» منتقل می‌شوند
export async function syncOwnedOrders(user) {
  if (!user?.id) return 0;
  const orders = asList(await base44.entities.Order.filter({ owner_id: user.id, status: 'listed' }, { limit: 100 }));
  if (!orders.length) return 0;
  const trades = asList(await base44.entities.Trade.filter({ participant_ids: user.id }, { limit: 200 }));
  let changed = 0;
  for (const order of orders) {
    const active = trades.find((t) => t.order_id === order.id && !['settled', 'cancelled', 'refunded'].includes(t.status));
    if (active) {
      await base44.entities.Order.update(order.id, {
        status: 'matched',
        accepted_trade_id: active.id,
        accepted_trade_code: active.trade_code,
        accepted_by_id: active.buyer_id === user.id ? active.seller_id : active.buyer_id
      });
      changed += 1;
    } else if (order.listing_expires_at && new Date(order.listing_expires_at).getTime() < Date.now()) {
      await base44.entities.Order.update(order.id, { status: 'expired' });
      changed += 1;
    }
  }
  return changed;
}

/* ========================== پذیرش سفارش و ساخت معامله ========================== */

export async function acceptOrder({ order, user, profile, settings }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای پذیرش سفارش باید وارد حساب کاربری خود شوید.', 401);
  if (order.owner_id === user.id) throw new AppError('SELF_TRADE', 'پذیرش سفارش خودتان مجاز نیست.', 409);
  if (order.status !== 'listed') throw new AppError('INVALID_STATE', 'این سفارش دیگر فعال نیست.', 409);

  const existing = asList(await base44.entities.Trade.filter({ order_id: order.id }, { limit: 20 }))
    .filter((t) => !['cancelled', 'refunded'].includes(t.status));
  if (existing.length) throw new AppError('ALREADY_MATCHED', 'برای این سفارش معامله فعالی وجود دارد.', 409);

  const fees = await quoteFees({ service: order.service, price: order.total_price });
  const buyerId = order.side === 'sell' ? user.id : order.owner_id;
  const sellerId = order.side === 'sell' ? order.owner_id : user.id;
  if (buyerId === sellerId) throw new AppError('SELF_TRADE', 'خریدار و فروشنده نمی‌توانند یک نفر باشند.', 409);

  const now = nowIso();
  const counterpartDisplay = order.owner_display || displayName(profile, user);

  const contract_hash = await hashContract({
    order_code: order.order_code,
    service: order.service,
    credit_amount: order.credit_amount,
    price: order.total_price,
    buyer_id: buyerId,
    seller_id: sellerId,
    delivery_method: order.delivery_method,
    deadline_minutes: order.deadline_minutes
  });

  const trade = await base44.entities.Trade.create({
    trade_code: genCode('TRD'),
    order_id: order.id,
    order_code: order.order_code,
    service: order.service,
    service_name: order.service_name,
    credit_amount: order.credit_amount,
    price: order.total_price,
    unit_rate: order.unit_rate,
    delivery_method: order.delivery_method,
    terms: order.terms,
    buyer_id: buyerId,
    buyer_display: buyerId === user.id ? displayName(profile, user) : counterpartDisplay,
    seller_id: sellerId,
    seller_display: sellerId === user.id ? displayName(profile, user) : counterpartDisplay,
    participant_ids: [buyerId, sellerId],
    status: 'awaiting_funding',
    buyer_fee: fees.buyer_fee,
    seller_fee: fees.seller_fee,
    platform_fee_total: fees.platform_fee_total,
    buyer_pays: fees.buyer_pays,
    net_to_seller: fees.net_to_seller,
    fee_snapshot: JSON.stringify(fees),
    contract_hash,
    escrow_mode: settings.escrow_enabled ? 'enabled' : 'disabled',
    funding_method: settings.escrow_enabled ? 'platform_escrow' : 'direct_between_parties',
    deadline_minutes: order.deadline_minutes,
    funding_deadline_at: addMinutes(now, order.deadline_minutes),
    status_timestamps: { matched: now, awaiting_funding: now },
    last_action: 'matched',
    last_action_at: now,
    dispute_status: 'none',
    settlement_locked: false,
    ledger_posted: false,
    ledger_state: 'none',
    payout_status: 'none',
    evidence_count: 0,
    funding_verified: false
  });

  await logTradeEvent(trade, {
    type: 'created',
    action: 'matched',
    from: 'listed',
    to: 'awaiting_funding',
    actor: { id: user.id, name: displayName(profile, user) },
    actorRole: order.side === 'sell' ? 'buyer' : 'seller',
    note: `معامله از سفارش ${order.order_code} ساخته شد`
  });

  // سفارش‌های متعلق به کاربر جاری را در همین مرحله همراستا می‌کنیم
  await syncOwnedOrders(user);

  return { trade, fees };
}

/* ============================ عملیات‌های معامله ============================ */

export async function applyTradeAction({ trade, action, user, profile, note, extra = {} }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای انجام این عملیات باید وارد حساب کاربری شوید.', 401);
  const def = TRADE_ACTIONS[action];
  if (!def) throw new AppError('ACTION_UNKNOWN', 'عملیات درخواستی شناخته نشد.');
  const role = roleOf(trade, user.id);
  const isAdmin = user.role === 'admin';
  if (!role && !isAdmin) throw new AppError('FORBIDDEN', 'شما طرف این معامله نیستید.', 403);
  if (!def.from.includes(trade.status)) {
    throw new AppError('INVALID_STATE', 'در وضعیت فعلی این عملیات مجاز نیست.', 409);
  }
  if (def.actor === 'admin' && !isAdmin) throw new AppError('ADMIN_REQUIRED', 'این عملیات فقط برای مدیر مجاز است.', 403);
  if (['buyer', 'seller'].includes(def.actor) && role !== def.actor) {
    throw new AppError('ROLE_MISMATCH', `این عملیات فقط توسط ${roleLabel(def.actor)} قابل انجام است.`, 403);
  }
  if (def.requiresEvidence && !extra.evidence_id && !extra.allow_without_evidence) {
    throw new AppError('EVIDENCE_REQUIRED', 'برای این مرحله بارگذاری مستند الزامی است.');
  }
  if (action === 'open_dispute' && (!note || note.trim().length < 10)) {
    throw new AppError('REASON_REQUIRED', 'دلیل اختلاف را کامل توضیح دهید (حداقل ۱۰ نویسه).');
  }
  if (action === 'admin_refund' && (!note || note.trim().length < 5)) {
    throw new AppError('REASON_REQUIRED', 'دلیل بازپرداخت را ثبت کنید.');
  }

  const settings = await loadSettings();
  const now = nowIso();
  const stamps = { ...(trade.status_timestamps || {}), [def.to]: now, [`action_${action}`]: now };
  const patch = {
    status: def.to,
    status_timestamps: stamps,
    last_action: action,
    last_action_at: now
  };

  if (action === 'declare_payment') {
    const txHash = String(extra.funding_reference || '').trim();
    if (settings.ton_enabled === true && txHash.length < 8) {
      throw new AppError('TON_TX_REQUIRED', 'هش تراکنش (TxID) پرداخت تون را وارد کنید.', 409);
    }
    patch.funding_declared_at = now;
    patch.funding_reference = txHash || null;
    patch.funding_verified = false;
    patch.funding_method = 'ton';
  }
  if (action === 'acknowledge_payment') {
    patch.delivery_deadline_at = addMinutes(now, trade.deadline_minutes || settings.default_deadline_minutes);
  }
  if (action === 'complete_purchase') {
    patch.seller_completed_at = now;
    patch.confirmation_deadline_at = addMinutes(now, settings.confirmation_window_minutes || 60);
  }
  if (action === 'confirm_receipt') {
    await assertNotSettled(trade);
    patch.buyer_confirmed_at = now;
    patch.settlement_locked = true;
    patch.payout_status = 'pending';
    patch.closed_at = now;
  }
  if (action === 'open_dispute') {
    patch.dispute_reason = note;
    patch.dispute_opened_by_id = user.id;
    patch.dispute_status = 'open';
    patch.settlement_locked = true;
  }
  if (action === 'cancel_trade') patch.cancelled_reason = note || 'لغو توافقی پیش از پرداخت';
  if (action === 'admin_cancel') patch.cancelled_reason = note || 'لغو توسط مدیر';
  if (action === 'admin_resolve_seller') {
    patch.dispute_status = 'resolved_seller';
    patch.resolution_note = note || '';
    patch.resolved_by_id = user.id;
    patch.settlement_locked = true;
    patch.payout_status = 'pending';
    patch.closed_at = now;
  }
  if (action === 'admin_refund') {
    patch.dispute_status = trade.dispute_status === 'open' ? 'resolved_buyer' : trade.dispute_status;
    patch.resolution_note = note || '';
    patch.resolved_by_id = user.id;
    patch.payout_status = 'blocked';
    patch.settlement_locked = true;
    patch.closed_at = now;
  }
  if (action === 'rate_seller') {
    patch.buyer_rating = Number(extra.rating);
    patch.buyer_rating_note = extra.rating_note || '';
  }

  const updated = await base44.entities.Trade.update(trade.id, patch);

  await logTradeEvent(updated, {
    type: action.startsWith('admin_') ? 'system' : 'transition',
    action,
    from: trade.status,
    to: def.to,
    actor: { id: user.id, name: displayName(profile, user) },
    actorRole: role || 'admin',
    note,
    meta: extra.funding_reference ? { funding_reference: extra.funding_reference } : undefined
  });

  if (action === 'confirm_receipt') {
    await recordBuyerCharge(updated, user, profile);
    await releaseOrderBack(updated);
  }
  if (action === 'cancel_trade' || action === 'admin_cancel') {
    await releaseOrderBack(updated);
  }
  if (action === 'admin_refund') {
    await reverseTradeLedger(updated, note);
  }
  return updated;
}

async function releaseOrderBack(trade) {
  try {
    const order = await base44.entities.Order.get(trade.order_id);
    if (!order || order.status !== 'matched') return;
    const expired = order.listing_expires_at && new Date(order.listing_expires_at).getTime() < Date.now();
    await base44.entities.Order.update(order.id, {
      status: expired ? 'expired' : 'listed',
      accepted_trade_id: null,
      accepted_trade_code: null,
      accepted_by_id: null
    });
  } catch {
    /* سفارش ممکن است در دسترس نباشد */
  }
}

// خریدار بدهی خود را در دفترکل ثبت می‌کند (فقط برای حساب خودش)
export async function recordBuyerCharge(trade, user, profile) {
  if (user?.id !== trade.buyer_id) return null;
  if (['buyer_posted', 'complete'].includes(trade.ledger_state)) return null;
  const entry = await postLedger({
    user_id: user.id,
    user_display: displayName(profile, user),
    trade_id: trade.id,
    trade_code: trade.trade_code,
    type: 'buyer_charge',
    direction: 'debit',
    amount: trade.buyer_pays,
    status: 'pending',
    note: `بدهی خریدار بابت معامله ${trade.trade_code}`
  });
  const state = trade.ledger_state === 'seller_posted' ? 'complete' : 'buyer_posted';
  await base44.entities.Trade.update(trade.id, { ledger_state: state, ledger_posted: state === 'complete' });
  await logTradeEvent(trade, {
    type: 'settlement',
    action: 'buyer_ledger',
    to: trade.status,
    actor: { id: user.id, name: displayName(profile, user) },
    actorRole: 'buyer',
    note: `ثبت بدهی خریدار — ${entry.entry_code}`
  });
  return entry;
}

// فروشنده طلب خود را در دفترکل ثبت می‌کند (فقط برای حساب خودش)
export async function recordSellerPayout(trade, user, profile) {
  if (user?.id !== trade.seller_id) return null;
  if (['seller_posted', 'complete'].includes(trade.ledger_state)) return null;
  const entry = await postLedger({
    user_id: user.id,
    user_display: displayName(profile, user),
    trade_id: trade.id,
    trade_code: trade.trade_code,
    type: 'seller_payout',
    direction: 'credit',
    amount: trade.net_to_seller,
    status: 'pending',
    note: `طلب فروشنده بابت معامله ${trade.trade_code}`
  });
  const state = trade.ledger_state === 'buyer_posted' ? 'complete' : 'seller_posted';
  await base44.entities.Trade.update(trade.id, { ledger_state: state, ledger_posted: state === 'complete' });
  await logTradeEvent(trade, {
    type: 'settlement',
    action: 'seller_ledger',
    to: trade.status,
    actor: { id: user.id, name: displayName(profile, user) },
    actorRole: 'seller',
    note: `ثبت طلب فروشنده — ${entry.entry_code}`
  });
  return entry;
}

export async function reverseTradeLedger(trade, reason) {
  const active = (await tradeLedger(trade.id)).filter((e) => e.status !== 'reversed');
  if (!active.length) return 0;
  const now = nowIso();
  await base44.entities.LedgerEntry.bulkUpdate(
    active.map((e) => ({ id: e.id, status: 'reversed', reversed_at: now }))
  );
  for (const e of active) {
    await postLedger({
      scope: e.scope,
      user_id: e.user_id,
      user_display: e.user_display,
      trade_id: e.trade_id,
      trade_code: e.trade_code,
      type: 'refund',
      direction: e.direction === 'credit' ? 'debit' : 'credit',
      amount: e.amount,
      status: 'pending',
      reference: e.entry_code,
      reversal_of: e.id,
      note: `برگشت رکورد ${e.entry_code} — ${reason || ''}`
    });
  }
  await base44.entities.Trade.update(trade.id, { ledger_state: 'complete', ledger_posted: true });
  return active.length;
}

export async function releasePayout({ trade, user, note }) {
  if (user?.role !== 'admin') throw new AppError('ADMIN_REQUIRED', 'این عملیات فقط برای مدیر مجاز است.', 403);
  const settings = await loadSettings();
  if (settings.ton_enabled !== true) {
    throw new AppError('TON_NOT_CONFIGURED', 'آزادسازی وجه تا فعال‌سازی پرداخت با تون امکان‌پذیر نیست.', 409);
  }
  if (trade.payout_status === 'released') throw new AppError('ALREADY_RELEASED', 'وجه این معامله قبلاً آزاد شده است.', 409);
  const pending = (await tradeLedger(trade.id)).filter((e) => e.status === 'pending');
  if (!pending.length) throw new AppError('NO_PENDING_ENTRIES', 'رکورد مالی در انتظار آزادسازی یافت نشد.', 409);
  const now = nowIso();
  for (const e of pending) {
    const delta = e.direction === 'credit' ? Number(e.amount) : -Number(e.amount);
    await base44.entities.LedgerEntry.update(e.id, { status: 'posted', posted_at: now, balance_after: delta });
  }
  const updated = await base44.entities.Trade.update(trade.id, { payout_status: 'released' });
  await base44.entities.AuditLog.create({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'release_payout',
    entity: 'Trade',
    entity_id: trade.id,
    reference: trade.trade_code,
    severity: 'critical',
    meta_text: JSON.stringify({ entries: pending.length, note: note || '' }),
    occurred_at: now
  });
  return updated;
}

/* ============================ مستندات و شواهد ============================ */

export const EVIDENCE_KINDS = [
  { id: 'receipt', name: 'رسید پرداخت' },
  { id: 'screenshot', name: 'تصویر صفحه' },
  { id: 'statement', name: 'صورتحساب' },
  { id: 'message', name: 'گفت‌وگوی متنی' },
  { id: 'other', name: 'سایر' }
];

export const EVIDENCE_VISIBILITY = [
  { id: 'private', name: 'خصوصی — فقط خودم و مدیر' },
  { id: 'shared', name: 'مشترک با طرف مقابل' },
  { id: 'admin_only', name: 'فقط مدیر بررسی کند' }
];

export async function addEvidence({ trade, user, profile, file, kind, title, description, visibility }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای بارگذاری مستند باید وارد حساب کاربری شوید.', 401);
  const role = roleOf(trade, user.id);
  if (!role && user.role !== 'admin') throw new AppError('FORBIDDEN', 'شما طرف این معامله نیستید.', 403);
  if (!file?.file_uri) throw new AppError('FILE_REQUIRED', 'فایل مستند انتخاب نشده است.');
  if (!EVIDENCE_KINDS.some((k) => k.id === kind)) throw new AppError('INVALID_KIND', 'نوع مستند معتبر نیست.');

  const counterpart = role === 'buyer' ? trade.seller_id : trade.buyer_id;
  const shared_with = visibility === 'shared' && counterpart
    ? [counterpart, user.id]
    : visibility === 'private'
      ? [user.id]
      : [];

  const evidence = await base44.entities.Evidence.create({
    trade_id: trade.id,
    trade_code: trade.trade_code,
    owner_id: user.id,
    owner_name: displayName(profile, user),
    owner_role: role || 'admin',
    kind,
    title: title || 'مستند معامله',
    description: description || '',
    file_uri: file.file_uri,
    file_name: file.name || 'file',
    file_size: file.size || 0,
    visibility,
    shared_with,
    created_at: nowIso()
  });
  await base44.entities.Trade.update(trade.id, { evidence_count: Number(trade.evidence_count || 0) + 1 });
  await logTradeEvent(trade, {
    type: 'evidence',
    action: 'add_evidence',
    to: trade.status,
    actor: { id: user.id, name: displayName(profile, user) },
    actorRole: role || 'admin',
    note: `بارگذاری مستند: ${evidence.title}`,
    meta: { kind, visibility }
  });
  return evidence;
}

/* =========================== مهلت‌ها و پایش =========================== */

export function deadlineCheck(trade) {
  const now = Date.now();
  const at = (iso) => (iso ? new Date(iso).getTime() : null);
  const funding = at(trade.funding_deadline_at);
  const delivery = at(trade.delivery_deadline_at);
  const confirmation = at(trade.confirmation_deadline_at);
  if (trade.status === 'awaiting_funding' && funding && funding < now) return { reason: 'funding_timeout', to: 'cancelled', note: 'مهلت پرداخت به پایان رسید و معامله لغو شد.' };
  if (['funded', 'awaiting_delivery', 'purchase_in_progress'].includes(trade.status) && delivery && delivery < now) {
    return { reason: 'delivery_timeout', to: 'disputed', note: 'مهلت تحویل به پایان رسید؛ تسویه خودکار متوقف و اختلاف ثبت شد.' };
  }
  if (trade.status === 'awaiting_confirmation' && confirmation && confirmation < now) {
    return { reason: 'confirmation_timeout', to: 'disputed', note: 'مهلت تأیید خریدار به پایان رسید؛ اختلاف ثبت شد.' };
  }
  return null;
}

// پایش مهلت‌ها به‌صورت واقعی؛ در نبود تابع زمان‌بندی‌شده سمت سرور، هنگام حضور کاربر اجرا می‌شود
export async function reconcileDeadlines({ user, profile, isAdmin }) {
  if (!user?.id) return [];
  const query = isAdmin ? {} : { participant_ids: user.id };
  const trades = asList(await base44.entities.Trade.filter(query, { limit: 100 }));
  const results = [];
  for (const trade of trades) {
    const check = deadlineCheck(trade);
    if (!check) continue;
    const role = roleOf(trade, user.id);
    if (!role && !isAdmin) continue;
    try {
      const patch = {
        status: check.to,
        last_action: 'deadline_expiry',
        last_action_at: nowIso(),
        status_timestamps: { ...(trade.status_timestamps || {}), [check.to]: nowIso(), action_deadline_expiry: nowIso() },
        expiry_reason: check.reason,
        settlement_locked: true
      };
      if (check.to === 'disputed') {
        patch.dispute_reason = check.note;
        patch.dispute_status = 'open';
        patch.dispute_opened_by_id = 'system';
      } else if (check.reason === 'funding_timeout') {
        patch.cancelled_reason = check.note;
      }
      const updated = await base44.entities.Trade.update(trade.id, patch);
      await logTradeEvent(updated, {
        type: 'expiry',
        action: 'deadline_expiry',
        from: trade.status,
        to: check.to,
        actor: { id: user.id, name: displayName(profile, user) },
        actorRole: role || 'admin',
        note: check.note,
        meta: { reason: check.reason }
      });
      if (check.reason === 'funding_timeout') await releaseOrderBack(updated);
      results.push(updated);
    } catch {
      /* بدون دسترسی، نادیده گرفته می‌شود */
    }
  }
  return results;
}

/* ============================== فروشگاه ============================== */

export async function saveProduct({ product, user, profile, values }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای ثبت کالا باید وارد حساب کاربری شوید.', 401);
  const title = (values.title || '').trim();
  if (title.length < 3) throw new AppError('INVALID_TITLE', 'نام کالا را کامل‌تر وارد کنید.');
  if (!Number(values.price_retail)) throw new AppError('INVALID_PRICE', 'قیمت خرده‌فروشی الزامی است.');
  const wholesale = Number(values.price_wholesale || 0);
  const payload = {
    title,
    description: values.description || '',
    category: values.category || 'سایر',
    brand: values.brand || '',
    unit: values.unit || 'عدد',
    price_retail: Math.round(Number(values.price_retail)),
    price_wholesale: wholesale ? Math.round(wholesale) : null,
    min_wholesale_qty: Number(values.min_wholesale_qty || 10),
    stock: Number(values.stock || 0),
    sku: values.sku || '',
    images: values.images || [],
    tags: values.tags || [],
    delivery_type: values.delivery_type || 'digital',
    delivery_note: values.delivery_note || '',
    status: values.status || 'active',
    seller_id: user.id,
    seller_name: displayName(profile, user),
    seller_verified: profile?.verification_status === 'verified',
    is_demo: false
  };
  if (product?.id) return await base44.entities.Product.update(product.id, payload);
  return await base44.entities.Product.create(payload);
}

export async function createStoreOrder({ product, user, profile, quantity, wholesale, deliveryAddress, contactPhone, buyerNote }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای ثبت سفارش باید وارد حساب کاربری شوید.', 401);
  if (product.is_demo) throw new AppError('DEMO_PRODUCT', 'این کالا نمونه است و قابل سفارش نیست. برای فروش واقعی، کالای خودتان را ثبت کنید.', 409);
  if (!product.seller_id) throw new AppError('INVALID_PRODUCT', 'فروشنده این کالا مشخص نیست.', 409);
  if (product.seller_id === user.id) throw new AppError('SELF_TRADE', 'خرید کالای خودتان مجاز نیست.', 409);
  if (product.status !== 'active') throw new AppError('INACTIVE_PRODUCT', 'این کالا در حال حاضر فعال نیست.', 409);

  // پرداخت فروشگاه روی شبکه تون انجام می‌شود؛ سفارش در وضعیت «در انتظار پرداخت» ثبت می‌گردد
  return await buildStoreOrder({ product, user, profile, quantity, wholesale, deliveryAddress, contactPhone, buyerNote });
}

export async function buildStoreOrder({ product, user, profile, quantity, wholesale, deliveryAddress, contactPhone, buyerNote }) {
  const qty = Number(quantity || 1);
  const minQty = Number(product.min_wholesale_qty || 10);
  if (wholesale && qty < minQty) throw new AppError('MIN_QUANTITY', `برای خرید عمده حداقل ${minQty} عدد لازم است.`);
  if (!wholesale && qty < 1) throw new AppError('INVALID_QUANTITY', 'تعداد سفارش معتبر نیست.');
  if (!product.is_demo && Number(product.stock || 0) < qty) throw new AppError('OUT_OF_STOCK', 'موجودی کافی برای این سفارش وجود ندارد.', 409);

  const unitPrice = Math.round(Number(wholesale ? product.price_wholesale || product.price_retail : product.price_retail));
  const subtotal = unitPrice * qty;
  const rule = await resolveFeeRule({ side: 'store', service: null });
  const commissionRate = rule ? Number(rule.rate_percent || 0) : 0;
  const commission = computeFeeAmount(rule, subtotal);

  const order = await base44.entities.StoreOrder.create({
    order_code: genCode('STR'),
    product_id: product.id,
    product_title: product.title,
    seller_id: product.seller_id,
    seller_name: product.seller_name,
    buyer_id: user.id,
    buyer_name: displayName(profile, user),
    participant_ids: [user.id, product.seller_id],
    quantity: qty,
    wholesale,
    unit_price: unitPrice,
    subtotal,
    commission_rate: commissionRate,
    commission_amount: commission,
    seller_net: subtotal - commission,
    status: 'awaiting_payment',
    payment_status: 'unpaid',
    delivery_type: product.delivery_type,
    delivery_address: deliveryAddress || '',
    contact_phone: contactPhone || '',
    buyer_note: buyerNote || '',
    ledger_posted: false
  });

  return order;
}

export const STORE_ACTIONS = {
  awaiting_payment: ['processing', 'cancelled'],
  processing: ['delivered', 'cancelled', 'disputed'],
  delivered: ['disputed', 'refunded'],
  disputed: ['refunded', 'delivered'],
  cancelled: [],
  refunded: []
};

export async function updateStoreOrderStatus({ order, user, nextStatus, note }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای این عملیات باید وارد حساب کاربری شوید.', 401);
  const isBuyer = order.buyer_id === user.id;
  const isSeller = order.seller_id === user.id;
  const isAdmin = user.role === 'admin';
  if (!isBuyer && !isSeller && !isAdmin) throw new AppError('FORBIDDEN', 'شما طرف این سفارش نیستید.', 403);
  if (!STORE_ACTIONS[order.status]?.includes(nextStatus)) {
    throw new AppError('INVALID_STATE', 'تغییر وضعیت درخواستی مجاز نیست.', 409);
  }
  if (['delivered', 'processing'].includes(nextStatus) && !isSeller && !isAdmin) {
    throw new AppError('ROLE_MISMATCH', 'این تغییر وضعیت فقط توسط فروشنده یا مدیر مجاز است.', 403);
  }
  if (nextStatus === 'refunded' && !isAdmin) throw new AppError('ADMIN_REQUIRED', 'بازپرداخت فقط توسط مدیر مجاز است.', 403);
  if (nextStatus === 'cancelled' && !['awaiting_payment'].includes(order.status) && !isAdmin) {
    throw new AppError('INVALID_STATE', 'پس از شروع آماده‌سازی، لغو سفارش فقط با ثبت اختلاف ممکن است.', 409);
  }
  const payload = { status: nextStatus };
  if (nextStatus === 'delivered') payload.delivered_at = nowIso();
  if (nextStatus === 'processing' && !order.stock_applied) {
    try {
      const product = await base44.entities.Product.get(order.product_id);
      if (product && !product.is_demo) {
        await base44.entities.Product.update(product.id, {
          stock: Math.max(0, Number(product.stock || 0) - Number(order.quantity || 0))
        });
      }
    } catch {
      /* موجودی توسط فروشنده مدیریت می‌شود */
    }
    payload.stock_applied = true;
  }
  if (nextStatus === 'cancelled') payload.cancelled_reason = note || 'لغو سفارش';
  const updated = await base44.entities.StoreOrder.update(order.id, payload);

  // فروشنده پس از تحویل، طلب خود را در حساب خودش ثبت می‌کند
  if (nextStatus === 'delivered' && (isSeller || isAdmin) && !order.ledger_posted) {
    await postLedger({
      user_id: order.seller_id,
      user_display: order.seller_name,
      store_order_id: order.id,
      store_order_code: order.order_code,
      type: 'store_sale',
      direction: 'credit',
      amount: order.seller_net,
      status: 'pending',
      note: `طلب فروش کالا — ${order.order_code}`
    });
    await base44.entities.StoreOrder.update(order.id, { ledger_posted: true });
  }
  if ((nextStatus === 'cancelled' || nextStatus === 'refunded') && order.stock_applied) {
    try {
      const product = await base44.entities.Product.get(order.product_id);
      if (product && !product.is_demo) {
        await base44.entities.Product.update(product.id, { stock: Number(product.stock || 0) + Number(order.quantity || 0) });
      }
    } catch {
      /* کالا ممکن است حذف شده باشد */
    }
    await base44.entities.StoreOrder.update(order.id, { stock_applied: false });
  }
  return updated;
}

/* ============================== پشتیبانی ============================== */

export async function createTicket({ user, profile, subject, category, message, trade }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای ثبت تیکت باید وارد حساب کاربری شوید.', 401);
  if (!subject || subject.trim().length < 3) throw new AppError('INVALID_SUBJECT', 'موضوع تیکت را وارد کنید.');
  if (!message || message.trim().length < 10) throw new AppError('INVALID_MESSAGE', 'متن پیام را کامل‌تر بنویسید.');
  const ticket = await base44.entities.SupportTicket.create({
    ticket_code: genCode('SUP'),
    user_id: user.id,
    user_name: displayName(profile, user),
    subject: subject.trim(),
    category: category || 'other',
    message: message.trim(),
    trade_id: trade?.id || null,
    trade_code: trade?.trade_code || null,
    status: 'open',
    priority: 'normal',
    replies_count: 0
  });
  return ticket;
}

export async function replyTicket({ ticket, user, profile, body, internal }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای پاسخ باید وارد حساب کاربری شوید.', 401);
  const isOwner = ticket.user_id === user.id;
  if (!isOwner && user.role !== 'admin') throw new AppError('FORBIDDEN', 'شما به این تیکت دسترسی ندارید.', 403);
  if (!body || body.trim().length < 2) throw new AppError('INVALID_MESSAGE', 'متن پاسخ را وارد کنید.');
  const isAdmin = user.role === 'admin';
  const message = await base44.entities.SupportMessage.create({
    ticket_id: ticket.id,
    author_id: user.id,
    author_name: displayName(profile, user),
    author_role: isAdmin ? 'admin' : 'user',
    body: body.trim(),
    participant_ids: [ticket.user_id, user.id].filter(Boolean),
    internal: !!internal && isAdmin
  });
  await base44.entities.SupportTicket.update(ticket.id, {
    status: isAdmin ? 'answered' : 'open',
    replies_count: Number(ticket.replies_count || 0) + 1,
    last_reply_at: nowIso(),
    last_reply_by: isAdmin ? 'پشتیبانی' : displayName(profile, user)
  });
  return message;
}

export async function closeTicket({ ticket, user }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای این عملیات باید وارد حساب کاربری شوید.', 401);
  if (ticket.user_id !== user.id && user.role !== 'admin') throw new AppError('FORBIDDEN', 'دسترسی مجاز نیست.', 403);
  return await base44.entities.SupportTicket.update(ticket.id, { status: 'closed' });
}

/* =========================== حساب و درآمدها =========================== */

export async function saveProfile({ profile, user, values }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای ذخیره پروفایل باید وارد حساب کاربری شوید.', 401);
  const target = profile || (await ensureProfile(user));
  const payload = {
    full_name: values.full_name || '',
    display_name: values.display_name || values.full_name || '',
    phone: values.phone || '',
    city: values.city || '',
    bio: values.bio || '',
    account_type: values.account_type || 'individual',
    last_seen_at: nowIso()
  };
  const updated = await base44.entities.UserProfile.update(target.id, payload);
  // سوابق سفارش‌های آگهی‌شده با نام جدید همراستا می‌شوند
  return updated;
}

export async function requestVerification({ user, profile, note }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای درخواست احراز هویت وارد شوید.', 401);
  const target = profile || (await ensureProfile(user));
  if (target.verification_status === 'verified') throw new AppError('ALREADY_VERIFIED', 'حساب شما قبلاً تأیید شده است.', 409);
  return await base44.entities.UserProfile.update(target.id, {
    verification_status: 'pending',
    verification_requested_at: nowIso(),
    admin_note: note || ''
  });
}

export async function requestSubscription({ user, profile, plan, price }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای ثبت درخواست اشتراک وارد شوید.', 401);
  const existing = asList(await base44.entities.Subscription.filter({ user_id: user.id }, { limit: 10 }))
    .find((s) => ['requested', 'pending_payment', 'active'].includes(s.status));
  if (existing) throw new AppError('DUPLICATE_REQUEST', 'درخواست اشتراک فعالی برای شما ثبت شده است.', 409);
  return await base44.entities.Subscription.create({
    user_id: user.id,
    user_name: displayName(profile, user),
    plan,
    price: Number(price || 0),
    status: 'requested',
    auto_renew: false,
    note: 'در انتظار تأیید مدیر و اتصال درگاه پرداخت'
  });
}

export async function requestPromotion({ order, user, profile, price }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای درخواست آگهی ویژه وارد شوید.', 401);
  if (order.owner_id !== user.id) throw new AppError('FORBIDDEN', 'فقط صاحب سفارش می‌تواند آگهی ویژه درخواست کند.', 403);
  const existing = asList(await base44.entities.OrderPromotion.filter({ order_id: order.id }, { limit: 10 }))
    .find((p) => ['requested', 'pending_payment', 'active'].includes(p.status));
  if (existing) throw new AppError('DUPLICATE_REQUEST', 'برای این سفارش درخواست آگهی ویژه ثبت شده است.', 409);
  return await base44.entities.OrderPromotion.create({
    order_id: order.id,
    order_code: order.order_code,
    user_id: user.id,
    user_name: displayName(profile, user),
    type: 'featured',
    price: Number(price || 0),
    status: 'requested'
  });
}

export async function applyReferralCode({ user, profile, code }) {
  if (!user?.id) throw new AppError('AUTH_REQUIRED', 'برای ثبت کد معرف وارد شوید.', 401);
  const clean = (code || '').trim().toUpperCase();
  if (!clean) throw new AppError('INVALID_CODE', 'کد معرف را وارد کنید.');
  const target = profile || (await ensureProfile(user));
  if (target.referred_by_code) throw new AppError('ALREADY_REFERRED', 'شما قبلاً کد معرف ثبت کرده‌اید.', 409);
  const matches = asList(await base44.entities.UserProfile.filter({ referral_code: clean }, { limit: 1 }));
  const referrer = matches[0];
  if (!referrer) throw new AppError('CODE_NOT_FOUND', 'کد معرف یافت نشد.', 404);
  if (referrer.user_id === user.id) throw new AppError('SELF_REFERRAL', 'استفاده از کد خودتان مجاز نیست.', 409);

  const referral = await base44.entities.Referral.create({
    code: clean,
    referrer_id: referrer.user_id,
    referrer_name: referrer.display_name || referrer.full_name || '',
    invitee_id: user.id,
    invitee_name: displayName(profile, user),
    status: 'joined',
    reward_points: 0,
    reward_amount: 0
  });
  await base44.entities.UserProfile.update(target.id, { referred_by_code: clean });
  return referral;
}

/* ============================== پنل مدیریت ============================== */

export const requireAdmin = (user) => {
  if (user?.role !== 'admin') throw new AppError('ADMIN_REQUIRED', 'این بخش فقط برای مدیر پلتفرم است.', 403);
};

export async function adminSaveFeeRule({ user, rule, values }) {
  requireAdmin(user);
  const payload = {
    name: (values.name || '').trim() || 'قانون کارمزد',
    scope: values.scope || 'global',
    service: values.scope === 'service' ? values.service : null,
    side: values.side || 'buy',
    fee_type: values.fee_type || 'percent',
    rate_percent: Number(values.rate_percent || 0),
    fixed_amount: Number(values.fixed_amount || 0),
    min_fee: Number(values.min_fee || 0),
    max_fee: Number(values.max_fee || 0),
    active: values.active !== false,
    priority: Number(values.priority || 10),
    notes: values.notes || '',
    updated_by: user.id
  };
  if (rule?.id) return await base44.entities.FeeRule.update(rule.id, payload);
  return await base44.entities.FeeRule.create(payload);
}

export async function adminSaveSetting({ user, key, label, group, value, value_type, description }) {
  requireAdmin(user);
  const existing = asList(await base44.entities.PlatformSetting.filter({ key }, { limit: 1 }))[0];
  const payload = {
    key,
    label: label || key,
    group: group || 'general',
    description: description || '',
    value: String(value),
    value_type: value_type || 'string',
    updated_by: user.id
  };
  if (existing?.id) return await base44.entities.PlatformSetting.update(existing.id, payload);
  return await base44.entities.PlatformSetting.create(payload);
}

export async function adminSetVerification({ user, profile, status, note }) {
  requireAdmin(user);
  return await base44.entities.UserProfile.update(profile.id, {
    verification_status: status,
    admin_note: note || profile.admin_note || ''
  });
}

export async function adminSetUserRole({ user, targetUserId, role }) {
  requireAdmin(user);
  if (!['admin', 'user'].includes(role)) throw new AppError('INVALID_ROLE', 'نقش انتخابی معتبر نیست.');
  if (targetUserId === user.id) throw new AppError('SELF_ROLE', 'تغییر نقش حساب خودتان مجاز نیست.', 409);
  const updated = await base44.entities.User.update(targetUserId, { role });
  await base44.entities.AuditLog.create({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'set_user_role',
    entity: 'User',
    entity_id: targetUserId,
    severity: 'critical',
    meta_text: JSON.stringify({ role }),
    occurred_at: nowIso()
  });
  return updated;
}

export async function adminApproveSubscription({ user, subscription, status, plan }) {
  requireAdmin(user);
  const now = nowIso();
  const expires = addMinutes(now, plan === 'pro_yearly' ? 525600 : 43200);
  const updated = await base44.entities.Subscription.update(subscription.id, {
    status,
    started_at: status === 'active' ? now : null,
    expires_at: status === 'active' ? expires : null
  });
  if (status === 'active') {
    const profiles = asList(await base44.entities.UserProfile.filter({ user_id: subscription.user_id }, { limit: 1 }));
    if (profiles[0]) {
      await base44.entities.UserProfile.update(profiles[0].id, {
        subscription_plan: 'pro',
        subscription_expires_at: expires
      });
    }
  }
  return updated;
}

export async function adminActivatePromotion({ user, promotion, status, days = 7 }) {
  requireAdmin(user);
  const now = nowIso();
  const updated = await base44.entities.OrderPromotion.update(promotion.id, {
    status,
    starts_at: status === 'active' ? now : null,
    ends_at: status === 'active' ? addMinutes(now, days * 1440) : null
  });
  if (status === 'active') {
    await base44.entities.Order.update(promotion.order_id, { featured: true });
  }
  return updated;
}

export async function adminGrantReferralReward({ user, referral, points, amount }) {
  requireAdmin(user);
  const now = nowIso();
  const updated = await base44.entities.Referral.update(referral.id, {
    status: 'rewarded',
    reward_points: Number(points || 0),
    reward_amount: Number(amount || 0),
    qualified_at: referral.qualified_at || now,
    rewarded_at: now
  });
  if (Number(points || 0) > 0) {
    await base44.entities.RewardLedger.create({
      entry_code: genCode('RWD'),
      user_id: referral.referrer_id,
      user_display: referral.referrer_name,
      kind: 'referral',
      direction: 'credit',
      points: Number(points),
      note: `پاداش معرفی کاربر ${referral.invitee_name || ''}`,
      status: 'posted',
      reference: referral.code
    });
  }
  return updated;
}

export async function adminRecomputeStats({ user, profile }) {
  requireAdmin(user);
  return await refreshProfileStats({ id: profile.user_id }, profile);
}