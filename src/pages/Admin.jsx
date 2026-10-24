import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import OverviewTab from '@/components/admin/OverviewTab';
import AdminTradesTab from '@/components/admin/AdminTradesTab';
import RulesTab from '@/components/admin/RulesTab';
import UsersTab from '@/components/admin/UsersTab';
import RevenueTab from '@/components/admin/RevenueTab';
import useCurrentUser from '@/hooks/useCurrentUser';

const TABS = [
  { id: 'overview', label: 'نمای کلی' },
  { id: 'trades', label: 'معاملات و اختلاف‌ها' },
  { id: 'rules', label: 'کارمزد و تنظیمات' },
  { id: 'users', label: 'کاربران و نقش‌ها' },
  { id: 'revenue', label: 'درآمد و اشتراک' }
];

export default function Admin() {
  const { user, isAdmin, isAuthed, loading } = useCurrentUser();
  const [tab, setTab] = useState('overview');

  if (loading) return <p className="text-xs text-muted-foreground">در حال بررسی دسترسی…</p>;

  if (!isAuthed || !isAdmin) {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-card p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="h-5 w-5" />
        </span>
        <p className="font-heading text-sm font-semibold text-foreground">دسترسی مدیریتی لازم است</p>
        <p className="mx-auto max-w-md text-[11px] leading-6 text-muted-foreground">
          این بخش فقط برای مدیر پلتفرم باز است. کنترل دسترسی در سطح رکورد اعمال می‌شود و داده‌های مالی کاربران دیگر برای شما قابل
          مشاهده نیست.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="font-heading text-xl font-bold text-foreground">داشبورد مدیریت</h1>
        <p className="text-[12px] text-muted-foreground">کنترل معاملات، اختلاف‌ها، کارمزدها، نقش‌ها و گزارش سودآوری</p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-medium transition ${
              tab === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <OverviewTab /> : null}
      {tab === 'trades' ? <AdminTradesTab /> : null}
      {tab === 'rules' ? <RulesTab user={user} /> : null}
      {tab === 'users' ? <UsersTab user={user} /> : null}
      {tab === 'revenue' ? <RevenueTab user={user} /> : null}
    </div>
  );
}