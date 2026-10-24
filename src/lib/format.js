const numberFormat = new Intl.NumberFormat('fa-IR');

export const num = (value) => numberFormat.format(Math.round(Number(value) || 0));

// نرخ تبدیل تومان به تون از تنظیمات پلتفرم خوانده و اینجا نگه داشته می‌شود
let TON_RATE = 400000;

export const setTonRate = (rate) => {
  const value = Number(rate);
  if (value > 0) TON_RATE = value;
};

export const getTonRate = () => TON_RATE;

export const tonOf = (tomanValue) => (Number(tomanValue) || 0) / TON_RATE;

export const tonText = (tomanValue) =>
  `≈ ${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(tonOf(tomanValue))} TON`;

export const toman = (value) => {
  const v = Math.round(Number(value) || 0);
  return v > 0 ? `${num(v)} تومان · ${tonText(v)}` : `${num(v)} تومان`;
};

export const compactToman = (value) => {
  const v = Math.round(Number(value) || 0);
  if (v >= 1000000000) return `${num(v / 1000000000)} میلیارد تومان`;
  if (v >= 1000000) return `${num(v / 1000000)} میلیون تومان`;
  if (v >= 1000) return `${num(v / 1000)} هزار تومان`;
  return toman(v);
};

export const percent = (value) => `${num(value)}٪`;

const dateOptions = { calendar: 'persian', year: 'numeric', month: 'short', day: 'numeric' };
const timeOptions = { calendar: 'persian', hour: '2-digit', minute: '2-digit' };

export const jalaliDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', dateOptions).format(new Date(value));
  } catch {
    return '—';
  }
};

export const jalaliDateTime = (value) => {
  if (!value) return '—';
  try {
    return `${new Intl.DateTimeFormat('fa-IR', dateOptions).format(new Date(value))} — ${new Intl.DateTimeFormat('fa-IR', timeOptions).format(new Date(value))}`;
  } catch {
    return '—';
  }
};

export const remainingMs = (deadline) => {
  if (!deadline) return null;
  return new Date(deadline).getTime() - Date.now();
};

export const durationText = (ms) => {
  if (ms === null || ms === undefined) return '—';
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const fa = (n) => numberFormat.format(n);
  let text = '';
  if (days > 0) text = `${fa(days)} روز و ${fa(hours % 24)} ساعت`;
  else if (hours > 0) text = `${fa(hours)} ساعت و ${fa(minutes % 60)} دقیقه`;
  else text = `${fa(minutes)} دقیقه`;
  return ms < 0 ? `${text} پیش` : text;
};

export const deadlineText = (deadline) => {
  const ms = remainingMs(deadline);
  if (ms === null) return null;
  return { expired: ms <= 0, text: ms <= 0 ? `مهلت ${durationText(ms)} به پایان رسیده` : `${durationText(ms)} باقی مانده` };
};

export const ratingText = (sum, count) => {
  const c = Number(count) || 0;
  if (!c) return 'بدون امتیاز';
  return `${numberFormat.format(Math.round((Number(sum) / c) * 10) / 10)} از ۵`;
};

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// ارقام فارسی و عربی هم به عدد لاتین تبدیل می‌شوند تا تایپ بیش از یک رقم کار کند
export const digitsOnly = (value) =>
  String(value || '')
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[^\d]/g, '');

export const parseAmount = (value) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits) : 0;
};