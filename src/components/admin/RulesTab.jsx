import { useEffect, useState } from 'react';
import { Loader2, Plus, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/StatusBadge';
import { CONNECTION_STATUS, EXTERNAL_CONNECTIONS, SERVICES } from '@/lib/credit';
import { adminSaveFeeRule, adminSaveSetting, loadSettings } from '@/lib/engine';
import { faErrorMessage } from '@/lib/api';
import { num, percent } from '@/lib/format';

const SETTING_FIELDS = [
  { key: 'listing_window_minutes', label: 'مدت اعتبار آگهی (دقیقه)' },
  { key: 'default_deadline_minutes', label: 'مهلت پیش‌فرض معامله (دقیقه)' },
  { key: 'confirmation_window_minutes', label: 'مهلت تأیید خریدار (دقیقه)' },
  { key: 'min_credit_amount', label: 'حداقل مبلغ اعتبار (تومان)' },
  { key: 'max_credit_amount', label: 'حداکثر مبلغ اعتبار (تومان)' },
  { key: 'min_trade_price', label: 'حداقل قیمت معامله (تومان)' },
  { key: 'pro_monthly_price', label: 'قیمت اشتراک ماهانه (تومان)' },
  { key: 'pro_yearly_price', label: 'قیمت اشتراک سالانه (تومان)' },
  { key: 'featured_listing_price', label: 'قیمت آگهی ویژه (تومان)' },
  { key: 'referral_reward_points', label: 'امتیاز پاداش معرفی' }
];

const EMPTY_RULE = {
  name: '',
  scope: 'global',
  service: 'digipay',
  side: 'buy',
  fee_type: 'percent',
  rate_percent: '1.5',
  fixed_amount: '0',
  min_fee: '0',
  max_fee: '0',
  priority: '10',
  active: true
};

export default function RulesTab({ user }) {
  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(EMPTY_RULE);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const [ruleRes, settingValues] = await Promise.all([
      base44.entities.FeeRule.list('-created_date', 100),
      loadSettings()
    ]);
    setRules(Array.isArray(ruleRes) ? ruleRes : ruleRes?.items || []);
    setSettings(settingValues);
  };

  useEffect(() => {
    load().catch(() => setError('بارگذاری قواعد ممکن نشد.'));
  }, []);

  const saveRule = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy('rule');
    try {
      await adminSaveFeeRule({ user, rule: editing, values: form });
      setForm(EMPTY_RULE);
      setEditing(null);
      await load();
      setMessage('قانون کارمزد ذخیره شد.');
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const editRule = (rule) => {
    setEditing(rule);
    setForm({
      name: rule.name,
      scope: rule.scope,
      service: rule.service || 'digipay',
      side: rule.side,
      fee_type: rule.fee_type,
      rate_percent: String(rule.rate_percent || 0),
      fixed_amount: String(rule.fixed_amount || 0),
      min_fee: String(rule.min_fee || 0),
      max_fee: String(rule.max_fee || 0),
      priority: String(rule.priority || 10),
      active: rule.active !== false
    });
  };

  const saveSettingValue = async (key, label, value, value_type = 'number', group = 'trades') => {
    setError('');
    setMessage('');
    setBusy(key);
    try {
      await adminSaveSetting({ user, key, label, group, value, value_type });
      await load();
      setMessage('تنظیمات ذخیره شد.');
    } catch (err) {
      setError(faErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={saveRule} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="font-heading text-sm font-semibold text-foreground">{editing ? 'ویرایش قانون کارمزد' : 'قانون کارمزد جدید'}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>نام</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="کارمزد خرید اعتبار" />
          </div>
          <div className="space-y-1.5">
            <Label>دامنه</Label>
            <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="global">عمومی</option>
              <option value="service">مخصوص یک سرویس</option>
              <option value="store">فروشگاه</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>سمت</Label>
            <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="buy">خریدار</option>
              <option value="sell">فروشنده</option>
              <option value="store">فروشگاه</option>
            </select>
          </div>
          {form.scope === 'service' ? (
            <div className="space-y-1.5">
              <Label>سرویس</Label>
              <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>نوع</Label>
            <select value={form.fee_type} onChange={(e) => setForm({ ...form, fee_type: e.target.value })} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
              <option value="percent">درصدی</option>
              <option value="fixed">مبلغ ثابت</option>
              <option value="percent_plus_fixed">درصد + ثابت</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>درصد</Label>
            <Input inputMode="decimal" value={form.rate_percent} onChange={(e) => setForm({ ...form, rate_percent: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>مبلغ ثابت</Label>
            <Input inputMode="numeric" value={form.fixed_amount} onChange={(e) => setForm({ ...form, fixed_amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>حداقل کارمزد</Label>
            <Input inputMode="numeric" value={form.min_fee} onChange={(e) => setForm({ ...form, min_fee: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>حداکثر کارمزد</Label>
            <Input inputMode="numeric" value={form.max_fee} onChange={(e) => setForm({ ...form, max_fee: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>اولویت</Label>
            <Input inputMode="numeric" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
          </div>
        </div>
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={busy === 'rule'} className="gap-1.5">
            {busy === 'rule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editing ? 'ذخیره تغییرات' : 'افزودن قانون'}
          </Button>
          {editing ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setForm(EMPTY_RULE); }}>
              انصراف
            </Button>
          ) : null}
        </div>
      </form>

      <div className="space-y-2">
        {rules.map((rule) => (
          <button
            key={rule.id}
            onClick={() => editRule(rule)}
            className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-right transition hover:border-primary/40"
          >
            <div>
              <p className="text-[13px] font-medium text-foreground">{rule.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {rule.scope === 'service' ? `سرویس ${rule.service}` : rule.scope === 'store' ? 'فروشگاه' : 'عمومی'} ·{' '}
                {rule.side === 'buy' ? 'خریدار' : rule.side === 'sell' ? 'فروشنده' : 'فروشگاه'} · {percent(rule.rate_percent)} + {num(rule.fixed_amount)} تومان
              </p>
            </div>
            <StatusBadge label={rule.active ? 'فعال' : 'غیرفعال'} tone={rule.active ? 'success' : 'muted'} />
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 font-heading text-sm font-semibold text-foreground">تنظیمات عملیاتی</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {settings
            ? SETTING_FIELDS.map((field) => (
                <SettingRow
                  key={field.key}
                  label={field.label}
                  value={settings[field.key]}
                  busy={busy === field.key}
                  onSave={(value) => saveSettingValue(field.key, field.label, value)}
                />
              ))
            : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-1 font-heading text-sm font-semibold text-foreground">اتصال شبکه TON</p>
        <p className="mb-3 text-[11px] leading-5 text-muted-foreground">
          مبالغ سایت با این نرخ به تون تبدیل و نمایش داده می‌شوند و پرداخت‌ها به آدرس کیف پول زیر انجام می‌گیرد.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {settings ? (
            <>
              <SettingRow
                label="نرخ هر TON (تومان)"
                value={settings.ton_rate_toman}
                busy={busy === 'ton_rate_toman'}
                onSave={(value) => saveSettingValue('ton_rate_toman', 'نرخ هر TON (تومان)', value)}
              />
              <SettingRow
                label="آدرس کیف پول TON"
                value={settings.ton_wallet_address}
                busy={busy === 'ton_wallet_address'}
                text
                onSave={(value) => saveSettingValue('ton_wallet_address', 'آدرس کیف پول TON', value, 'string', 'integrations')}
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 font-heading text-sm font-semibold text-foreground">اتصال‌های خارجی (فقط خواندنی)</p>
        <div className="space-y-2">
          {EXTERNAL_CONNECTIONS.map((conn) => (
            <div key={conn.id} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-2.5 py-2">
              <div>
                <p className="text-[12px] font-medium text-foreground">{conn.name}</p>
                <p className="text-[10px] text-muted-foreground">{conn.note}</p>
              </div>
              <StatusBadge label={CONNECTION_STATUS[conn.status].label} tone={CONNECTION_STATUS[conn.status].tone} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
          این وضعیت‌ها از پیکربندی واقعی پلتفرم خوانده می‌شوند و با کلید نمایشی فعال نمی‌شوند؛ اتصال درگاه یا امانت‌داری فقط پس از
          پیکربندی و آزمایش واقعی فعال خواهد شد.
        </p>
      </div>
    </div>
  );
}

function SettingRow({ label, value, onSave, busy, text }) {
  const [draft, setDraft] = useState(String(value ?? ''));
  useEffect(() => setDraft(String(value ?? '')), [value]);
  const dirty = String(value ?? '') !== draft;
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label className="text-[11px]">{label}</Label>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputMode={text ? 'text' : 'numeric'}
          dir={text ? 'ltr' : undefined}
        />
      </div>
      <Button type="button" size="sm" variant={dirty ? 'default' : 'outline'} disabled={!dirty || busy} onClick={() => onSave(draft)} className="gap-1">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}