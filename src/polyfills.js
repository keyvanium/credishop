// پلی‌فیل Buffer برای کتابخانه‌های TON در مرورگر
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  globalThis.Buffer = globalThis.Buffer || Buffer;
}
