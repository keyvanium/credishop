// برچسب‌ها و نگاشت‌های نمایشی دامنه اعتبار (آینه‌ی config سمت سرور برای نمایش)

export const SERVICES = [
  { id: 'digipay', name: 'دیجی‌پی', category: 'خرید اعتباری', color: 'from-rose-500/90 to-orange-400/90' },
  { id: 'snapppay', name: 'اسنپ‌پی', category: 'خرید اعتباری', color: 'from-emerald-500/90 to-teal-400/90' },
  { id: 'torobpay', name: 'ترب‌پی', category: 'خرید اعتباری', color: 'from-sky-500/90 to-indigo-500/90' },
  { id: 'basalam', name: 'باسلام', category: 'فروشگاه آنلاین', color: 'from-amber-500/90 to-yellow-400/90' }
];

export const serviceName = (id) => SERVICES.find((s) => s.id === id)?.name || id || '—';

export const DELIVERY_METHODS = [
  { id: 'in_app_purchase', name: 'خرید درون‌برنامه‌ای توسط فروشنده' },
  { id: 'buyer_in_app', name: 'خرید درون‌برنامه‌ای توسط خریدار' },
  { id: 'gift_voucher', name: 'انتقال ووچر یا کارت هدیه' },
  { id: 'wallet_transfer', name: 'انتقال اعتبار به کیف پول سرویس' }
];

export const deliveryName = (id) => DELIVERY_METHODS.find((d) => d.id === id)?.name || '—';

export const ORDER_STATUSES = {
  draft: { label: 'پیش‌نویس', tone: 'muted' },
  listed: { label: 'آگهی فعال', tone: 'info' },
  matched: { label: 'تطبیق‌شده', tone: 'warning' },
  cancelled: { label: 'لغو‌شده', tone: 'muted' },
  expired: { label: 'منقضی‌شده', tone: 'muted' }
};

export const TRADE_STATUSES = {
  draft: { label: 'پیش‌نویس', tone: 'muted' },
  listed: { label: 'آگهی‌شده', tone: 'info' },
  matched: { label: 'تطبیق‌شده', tone: 'info' },
  awaiting_funding: { label: 'در انتظار پرداخت', tone: 'warning' },
  funded: { label: 'پرداخت اعلام‌شده', tone: 'warning' },
  awaiting_delivery: { label: 'در انتظار تحویل', tone: 'warning' },
  purchase_in_progress: { label: 'خرید در جریان', tone: 'warning' },
  awaiting_confirmation: { label: 'در انتظار تأیید خریدار', tone: 'warning' },
  settled: { label: 'معامله تکمیل‌شده', tone: 'success' },
  cancelled: { label: 'لغو‌شده', tone: 'muted' },
  disputed: { label: 'در اختلاف', tone: 'danger' },
  refunded: { label: 'بازپرداخت‌شده', tone: 'danger' }
};

export const TRADE_FLOW = [
  'draft',
  'listed',
  'matched',
  'awaiting_funding',
  'funded',
  'awaiting_delivery',
  'purchase_in_progress',
  'awaiting_confirmation',
  'settled'
];

export const LEDGER_TYPES = {
  buyer_charge: 'بدهی خریدار',
  seller_payout: 'طلب فروشنده',
  buyer_fee: 'کارمزد خریدار',
  seller_fee: 'کارمزد فروشنده',
  platform_fee: 'کارمزد پلتفرم',
  store_commission: 'کمیسیون فروشگاه',
  store_sale: 'فروش کالا',
  refund: 'بازپرداخت',
  adjustment: 'اصلاح حساب',
  subscription: 'اشتراک حرفه‌ای',
  promotion: 'آگهی ویژه',
  referral_reward: 'پاداش معرفی',
  gateway_fee: 'کارمزد درگاه'
};

export const LEDGER_STATUSES = {
  pending: { label: 'در انتظار تسویه', tone: 'warning' },
  posted: { label: 'تسویه‌شده', tone: 'success' },
  reversed: { label: 'برگشت‌خورده', tone: 'muted' }
};

export const TONE_CLASSES = {
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200'
};

export const STORE_STATUSES = {
  awaiting_payment: { label: 'در انتظار پرداخت', tone: 'warning' },
  processing: { label: 'در حال آماده‌سازی', tone: 'info' },
  delivered: { label: 'تحویل‌شده', tone: 'success' },
  cancelled: { label: 'لغو‌شده', tone: 'muted' },
  refunded: { label: 'بازپرداخت‌شده', tone: 'danger' },
  disputed: { label: 'در اختلاف', tone: 'danger' }
};

export const PRODUCT_STATUSES = {
  active: { label: 'فعال', tone: 'success' },
  inactive: { label: 'غیرفعال', tone: 'muted' },
  archived: { label: 'بایگانی', tone: 'muted' }
};

export const TICKET_STATUSES = {
  open: { label: 'باز', tone: 'warning' },
  answered: { label: 'پاسخ داده‌شده', tone: 'info' },
  closed: { label: 'بسته‌شده', tone: 'muted' }
};

export const VERIFICATION_STATUSES = {
  unverified: { label: 'تأیید نشده', tone: 'muted' },
  pending: { label: 'در بررسی', tone: 'warning' },
  verified: { label: 'تأییدشده', tone: 'success' }
};

export const TIERS = {
  bronze: { label: 'برنزی', note: 'سطح شروع' },
  silver: { label: 'نقره‌ای', note: 'از ۵ معامله موفق' },
  gold: { label: 'طلایی', note: 'از ۲۰ معامله موفق' }
};

export const EXTERNAL_CONNECTIONS = [
  { id: 'ton_network', name: 'شبکه TON و کیف پول', status: 'connected', note: 'پرداخت، تسویه و تبدیل مبالغ با تون' },
  { id: 'escrow', name: 'امانت‌گذاری وجه', status: 'disabled', note: 'در نسخه فعلی غیرفعال' },
  { id: 'credit_api', name: 'API سرویس‌های اعتبار', status: 'not_configured', note: 'شارژ خودکار اعتبار' },
  { id: 'telegram_bot', name: 'ربات تلگرام و مینی‌اپ', status: 'not_configured', note: 'ارتباط کاربران از تلگرام' },
  { id: 'games', name: 'گردونه، تاس و جشنواره', status: 'connected', note: 'امتیاز و جایزه قابل تبدیل به پول' }
];

export const CONNECTION_STATUS = {
  not_configured: { label: 'اتصال تکمیل‌نشده', tone: 'warning' },
  disabled: { label: 'غیرفعال در این نسخه', tone: 'muted' },
  connected: { label: 'فعال', tone: 'success' }
};