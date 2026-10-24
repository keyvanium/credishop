import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  Gift,
  LayoutGrid,
  ListChecks,
  LogIn,
  LogOut,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import useCurrentUser from '@/hooks/useCurrentUser';
import useDeadlineWatch from '@/hooks/useDeadlineWatch';
import { setTonRate } from '@/lib/format';

const MAIN_LINKS = [
  { to: '/sell', label: 'فروش اعتبار', icon: ListChecks },
  { to: '/buy', label: 'خرید اعتبار', icon: ReceiptText },
  { to: '/market', label: 'مارکت‌لیست', icon: LayoutGrid },
  { to: '/store', label: 'فروشگاه', icon: Store },
  { to: '/rewards', label: 'جشنواره', icon: Gift },
  { to: '/smart-contract', label: 'اسمارت کانترکت', icon: ShieldCheck }
];

const MOBILE_LINKS = [
  { to: '/market', label: 'بازار', icon: LayoutGrid },
  { to: '/trades', label: 'معاملات', icon: ShieldCheck },
  { to: '/store', label: 'فروشگاه', icon: ShoppingBag },
  { to: '/rewards', label: 'جشنواره', icon: Gift },
  { to: '/account', label: 'حساب', icon: UserRound }
];

export default function Layout() {
  const { user, profile, isAuthed, isAdmin, signIn } = useCurrentUser();
  const location = useLocation();
  useDeadlineWatch({ user, profile, isAdmin });
  const [unread, setUnread] = useState(0);
  const [, setTonRateTick] = useState(0);

  // نرخ تبدیل تون از تنظیمات پلتفرم خوانده و برای نمایش کنار همه مبالغ به‌روز می‌شود
  useEffect(() => {
    base44.entities.PlatformSetting.filter({ key: 'ton_rate_toman' }, { limit: 1 })
      .then((res) => {
        const row = res?.items?.[0];
        if (!row) return;
        setTonRate(row.value);
        setTonRateTick((tick) => tick + 1);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setUnread(0);
      return;
    }
    base44.entities.Notification.filter({ user_id: user.id, read: false }, { limit: 1 })
      .then((res) => setUnread(res?.items?.length ? 1 : 0))
      .catch(() => setUnread(0));
  }, [user, location.pathname]);

  const logout = async () => {
    await base44.auth.logout();
    window.location.href = '/';
  };

  const navClass = useMemo(
    () => ({ isActive }) =>
      `rounded-full px-3 py-2 text-[13px] font-medium transition ${isActive ? 'bg-gradient-to-l from-violet-600/90 to-fuchsia-600/90 text-white shadow-glow' : 'text-slate-400 hover:bg-white/5 hover:text-foreground'}`,
    []
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
        <div className="header-glow-line absolute inset-x-0 bottom-0 h-px" aria-hidden />
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-sky-500 text-white shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="font-heading text-sm font-bold text-foreground">اعتبارمارکت</span>
              <span className="text-[10px] text-muted-foreground">بازار امن اعتبار خرید</span>
            </span>
          </Link>

          <nav className="mr-2 hidden flex-1 items-center gap-1 lg:flex">
            {MAIN_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mr-auto flex items-center gap-1.5">
            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              aria-label="اعلان‌ها"
            >
              <Bell className="h-4.5 w-4.5" />
              {unread ? <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" /> : null}
            </Link>
            {isAuthed ? (
              <>
                {isAdmin ? (
                  <Link
                    to="/admin"
                    className="hidden rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition hover:bg-white/5 hover:text-foreground sm:block"
                  >
                    مدیریت
                  </Link>
                ) : null}
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[13px] font-medium text-foreground transition hover:bg-white/[0.08]"
                >
                  <UserRound className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.full_name || 'حساب من'}</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={logout} aria-label="خروج">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="gap-1.5" onClick={signIn}>
                <LogIn className="h-4 w-4" />
                ورود
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:pb-12">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-background/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-between px-2">
          {MOBILE_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${isActive ? 'text-fuchsia-300' : 'text-slate-500'}`
              }
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
