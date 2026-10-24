import { useCallback, useEffect, useState } from 'react';
import { Coins, Copy, Gift, Loader2, Sparkles, Users } from 'lucide-react';
import DiceGame from '@/components/rewards/DiceGame';
import MissionList from '@/components/rewards/MissionList';
import RedeemPanel from '@/components/rewards/RedeemPanel';
import SpinWheel from '@/components/rewards/SpinWheel';
import SignInPrompt from '@/components/SignInPrompt';
import { Button } from '@/components/ui/button';
import useCurrentUser from '@/hooks/useCurrentUser';
import { COMBO_POINTS, MISSIONS, addReward, dateKey, loadRewardState, pointsToToman, redeemPoints } from '@/lib/gamify';
import { num, toman } from '@/lib/format';

export default function Rewards() {
  const { user, profile, isAuthed, signIn } = useCurrentUser();
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setState(await loadRewardState(user, profile));
  }, [user?.id, profile]);

  useEffect(() => {
    load().catch(() => setError('بارگذاری جشنواره ممکن نشد.'));
  }, [load]);

  const run = async (id, fn) => {
    setBusy(id);
    setError('');
    setMessage('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err?.message || 'انجام این عملیات ممکن نشد.');
    } finally {
      setBusy('');
    }
  };

  const handleSpin = (prize) =>
    run('spin', async () => {
      await addReward({
        user,
        profile,
        kind: 'spin',
        points: prize.points,
        note: `گردونه شانس — ${prize.label}`,
        reference: `spin-${dateKey()}`
      });
    });

  const handleRoll = (face, points) =>
    run('dice', async () => {
      await addReward({
        user,
        profile,
        kind: 'dice',
        points,
        note: `تاس روزانه — عدد ${num(face)}`,
        reference: `dice-${dateKey()}`
      });
    });

  const claimCombo = () =>
    run('combo', async () => {
      await addReward({
        user,
        profile,
        kind: 'loyalty',
        points: COMBO_POINTS,
        note: 'کمبوی روزانه گردونه و تاس',
        reference: `combo-${dateKey()}`
      });
    });

  const claimMission = (mission) =>
    run(mission.id, async () => {
      await addReward({
        user,
        profile,
        kind: 'mission',
        points: mission.points,
        note: `ماموریت — ${mission.title}`,
        reference: mission.id
      });
    });

  const redeem = (points) =>
    run('redeem', async () => {
      const amount = await redeemPoints({ user, profile, points });
      setMessage(`درخواست تبدیل ${num(points)} امتیاز ثبت شد؛ ${toman(amount)} به کیف پاداش شما اضافه شد و پس از تسویه قابل برداشت است.`);
    });

  const copyCode = async () => {
    if (!state?.referralCode) return;
    await navigator.clipboard?.writeText(state.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!isAuthed) {
    return (
      <SignInPrompt
        title="برای شرکت در جشنواره وارد شوید"
        description="گردونه، تاس، ماموریت‌ها و امتیازهای جایزه به حساب شما گره می‌خورند."
        onSignIn={signIn}
      />
    );
  }

  const comboReady = state && state.spinDone && state.diceDone && !state.comboDone;
  const missions = (state?.facts
    ? MISSIONS.map((m) => ({
        ...m,
        done: state.claimedMissions.includes(m.id),
        ready: m.need(state.facts)
      }))
    : []);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-l from-indigo-600 via-violet-600 to-fuchsia-500 p-5 text-white">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-white/80">
          <Sparkles className="h-4 w-4" />
          جشنواره امتیاز و جایزه اعتبارمارکت
        </p>
        <h1 className="mt-1 font-heading text-xl font-bold">بازی کن، امتیاز بگیر، پول بگیر</h1>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
            <p className="text-[10px] text-white/80">کیف امتیاز</p>
            <p className="font-heading text-lg font-bold">{state ? num(state.balance) : '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
            <p className="text-[10px] text-white/80">معادل ریالی</p>
            <p className="font-heading text-[13px] font-bold leading-7">
              {state ? toman(pointsToToman(state.balance)) : '—'}
            </p>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p> : null}

      {!state ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری جشنواره…
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <SpinWheel done={state.spinDone} onSpin={handleSpin} balance={state.balance} />
            <div className="space-y-4">
              <DiceGame done={state.diceDone} onRoll={handleRoll} />
              <section className="rounded-3xl border border-border bg-card p-4">
                <p className="font-heading text-sm font-bold text-foreground">کمبوی روزانه</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  اگر امروز هم گردونه بچرخانید و هم تاس بیندازید، {COMBO_POINTS} امتیاز اضافه می‌گیرید.
                </p>
                <Button
                  className="mt-3 w-full gap-1.5"
                  variant={comboReady ? 'default' : 'outline'}
                  disabled={!comboReady || busy === 'combo'}
                  onClick={claimCombo}
                >
                  {busy === 'combo' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                  {state.comboDone ? 'کمبوی امروز دریافت شد' : comboReady ? 'دریافت جایزه کمبو' : 'برای فعال‌شدن کمبو هر دو بازی را انجام دهید'}
                </Button>
              </section>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RedeemPanel balance={state.balance} onRedeem={redeem} busy={busy === 'redeem'} />
            <section className="rounded-3xl border border-border bg-card p-4">
              <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                معرفی دوستان
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                با هر دعوت موفق، هم شما و هم دوستتان امتیاز جایزه می‌گیرید.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-dashed border-border bg-muted/40 px-3 py-2 text-center font-mono text-[13px] tracking-widest text-foreground">
                  {state.referralCode || 'در حال ساخت…'}
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={copyCode} disabled={!state.referralCode}>
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'کپی شد' : 'کپی'}
                </Button>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Gift className="h-3.5 w-3.5" />
                تعداد دعوت‌های موفق: {num(state.facts.referrals)}
              </p>
            </section>
          </div>

          <MissionList missions={missions} onClaim={claimMission} busyId={busy} />
        </>
      )}
    </div>
  );
}