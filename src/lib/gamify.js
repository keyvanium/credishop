import { base44 } from '@/api/base44Client';
import { genCode } from '@/lib/engine';

const asList = (res) => (Array.isArray(res) ? res : res?.items || []);

/* هر امتیاز معادل ۱۰ تومان جایزه نقدی است */
export const TOMAN_PER_POINT = 10;
export const MIN_REDEEM_POINTS = 100;

export const WHEEL_PRIZES = [
  { id: 'p10', label: '۱۰ امتیاز', points: 10, color: '#38bdf8' },
  { id: 'p5', label: '۵ امتیاز', points: 5, color: '#818cf8' },
  { id: 'p200', label: '۲۰۰ امتیاز', points: 200, color: '#fbbf24' },
  { id: 'p15', label: '۱۵ امتیاز', points: 15, color: '#34d399' },
  { id: 'p100', label: '۱۰۰ امتیاز', points: 100, color: '#f472b6' },
  { id: 'p25', label: '۲۵ امتیاز', points: 25, color: '#22d3ee' },
  { id: 'p500', label: '۵۰۰ امتیاز', points: 500, color: '#facc15' },
  { id: 'p50', label: '۵۰ امتیاز', points: 50, color: '#a78bfa' }
];

export const DICE_POINTS = { 1: 5, 2: 10, 3: 15, 4: 25, 5: 40, 6: 60 };
export const COMBO_POINTS = 40;

export const MISSIONS = [
  { id: 'profile_complete', title: 'تکمیل پروفایل و شماره تماس', note: 'نام نمایشی، موبایل و شهر را کامل کنید', points: 50, need: (f) => f.profileComplete },
  { id: 'verify', title: 'احراز هویت تأییدشده', note: 'پس از تأیید مدارک توسط مدیر', points: 200, need: (f) => f.verified },
  { id: 'first_trade', title: 'اولین معامله تکمیل‌شده', note: 'یک معامله را تا تسویه پیش ببرید', points: 150, need: (f) => f.settledTrades >= 1 },
  { id: 'three_trades', title: 'سه معامله موفق', note: 'اعتبار و اعتماد بیشتر، جایزه بیشتر', points: 350, need: (f) => f.settledTrades >= 3 },
  { id: 'first_product', title: 'ثبت اولین کالا در فروشگاه', note: 'یک کالای واقعی ثبت کنید', points: 80, need: (f) => f.products >= 1 },
  { id: 'invite_friend', title: 'دعوت یک دوست با کد معرف', note: 'دوست شما با کد شما عضو شود', points: 150, need: (f) => f.referrals >= 1 }
];

export const isToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

export const dateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const pointsToToman = (points) => Math.round(Number(points) || 0) * TOMAN_PER_POINT;

const displayOf = (profile, user) =>
  profile?.display_name || profile?.full_name || user?.full_name || user?.email || 'کاربر';

export async function loadRewardState(user, profile) {
  const [entries, settledTrades, products, referrals] = await Promise.all([
    base44.entities.RewardLedger.filter({ user_id: user.id }, { sort: '-created_date', limit: 200 })
      .then(asList)
      .catch(() => []),
    base44.entities.Trade.count({ participant_ids: user.id, status: 'settled' }).catch(() => 0),
    base44.entities.Product.count({ seller_id: user.id }).catch(() => 0),
    base44.entities.Referral.count({ referrer_id: user.id }).catch(() => 0)
  ]);

  const balance = entries
    .filter((e) => e.status !== 'reversed')
    .reduce((sum, e) => sum + (e.direction === 'debit' ? -Number(e.points || 0) : Number(e.points || 0)), 0);

  return {
    entries,
    balance: Math.max(0, balance),
    spinDone: entries.some((e) => e.kind === 'spin' && isToday(e.created_date)),
    diceDone: entries.some((e) => e.kind === 'dice' && isToday(e.created_date)),
    comboDone: entries.some((e) => String(e.reference || '').startsWith('combo-') && isToday(e.created_date)),
    claimedMissions: entries.filter((e) => e.kind === 'mission').map((e) => e.reference),
    facts: {
      profileComplete: Boolean(profile?.phone && profile?.city && (profile?.display_name || profile?.full_name)),
      verified: profile?.verification_status === 'verified',
      settledTrades: Number(settledTrades) || 0,
      products: Number(products) || 0,
      referrals: Number(referrals) || 0
    },
    referralCode: profile?.referral_code || ''
  };
}

export async function addReward({ user, profile, kind, points, note, reference }) {
  return await base44.entities.RewardLedger.create({
    entry_code: genCode('RWD'),
    user_id: user.id,
    user_display: displayOf(profile, user),
    kind,
    direction: 'credit',
    points: Number(points || 0),
    note: note || '',
    status: 'posted',
    reference: reference || null
  });
}

export async function redeemPoints({ user, profile, points }) {
  const value = Math.round(Number(points) || 0);
  if (value < MIN_REDEEM_POINTS) throw new Error(`حداقل امتیاز قابل تبدیل ${MIN_REDEEM_POINTS} است.`);
  const amount = pointsToToman(value);
  await base44.entities.RewardLedger.create({
    entry_code: genCode('RWD'),
    user_id: user.id,
    user_display: displayOf(profile, user),
    kind: 'adjustment',
    direction: 'debit',
    points: value,
    note: `تبدیل امتیاز جشنواره به پاداش نقدی`,
    status: 'posted',
    reference: 'redeem'
  });
  await base44.entities.LedgerEntry.create({
    entry_code: genCode('LED'),
    scope: 'user',
    user_id: user.id,
    user_display: displayOf(profile, user),
    type: 'promotion',
    direction: 'credit',
    amount,
    status: 'pending',
    requires_gateway: false,
    note: `پاداش نقدی جشنواره — تبدیل ${value} امتیاز`
  });
  return amount;
}