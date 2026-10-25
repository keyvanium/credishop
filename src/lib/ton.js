import { beginCell } from '@ton/core';

/*
 * اتصال به شبکه TON
 *
 * معماری لنگر قراردادها (Contract Anchoring):
 * هر معامله از قبل یک هش SHA-256 دارد (contract_hash). برای «زنجیره‌ای» شدن،
 * یک تراکنش TON با کامنت متنی به شکل زیر ثبت می‌شود:
 *      CS:<trade_code>:<contract_hash>
 * سپس با جست‌وجوی تراکنش‌های فرستنده در toncenter، وجود همان کامنت روی چین
 * تأیید می‌شود و هش تراکنش + لینک tonscan روی معامله ذخیره می‌گردد.
 *
 * شبکه از VITE_TON_NETWORK خوانده می‌شود: 'testnet' (پیش‌فرض) یا 'mainnet'.
 */

export const TON_NETWORK = (import.meta.env.VITE_TON_NETWORK || 'testnet').trim();
export const IS_TESTNET = TON_NETWORK !== 'mainnet';

// chain id در TonConnect: مین‌نت '-239'، تست‌نت '-3'
export const TON_CHAIN = IS_TESTNET ? '-3' : '-239';

export const TONCENTER_API = IS_TESTNET
  ? 'https://testnet.toncenter.com/api/v2'
  : 'https://toncenter.com/api/v2';

export const TONSCAN_TX = (hash) =>
  `https://${IS_TESTNET ? 'testnet.' : ''}tonscan.org/tx/${hash}`;

export const TONSCAN_ADDRESS = (address) =>
  `https://${IS_TESTNET ? 'testnet.' : ''}tonscan.org/address/${address}`;

// آدرس خزانه/لنگر پلتفرم؛ تا تنظیم نشود، تراکنش به خودِ کاربر بازمی‌گردد
export const ANCHOR_ADDRESS = (import.meta.env.VITE_TON_ANCHOR_ADDRESS || '').trim();

// کارمزد نمادین لنگر (نانوتون) — 0.01 TON
export const ANCHOR_FEE_NANOTON = '10000000';

export const anchorComment = (trade) => {
  const code = trade?.trade_code || 'TRADE';
  const hash = trade?.contract_hash || '';
  return `CS:${code}:${hash}`;
};

// ساخت payload قابل‌ارسال برای TonConnect از یک کامنت متنی
export function buildCommentPayload(text) {
  const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
  return cell.toBoc().toString('base64');
}

const headers = () => {
  const key = import.meta.env.VITE_TONCENTER_API_KEY;
  return key ? { 'X-API-Key': key } : {};
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`toncenter ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'toncenter error');
  return data.result;
}

/*
 * جست‌وجوی تراکنش لنگر در تراکنش‌های اخیر آدرس فرستنده.
 * خروجی: { hash, lt, now } یا null
 */
export async function findAnchorTransaction(senderAddress, comment, { limit = 30 } = {}) {
  const params = new URLSearchParams({ address: senderAddress, limit: String(limit), archival: 'true' });
  const txs = await fetchJson(`${TONCENTER_API}/getTransactions?${params}`);
  for (const tx of txs || []) {
    const text = tx?.in_msg?.msg_data?.text;
    if (typeof text === 'string' && text === comment) {
      return {
        hash: tx.transaction_id?.hash,
        lt: tx.transaction_id?.lt,
        now: tx.utime,
        value: tx.in_msg?.value
      };
    }
  }
  return null;
}

export const shortAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};
