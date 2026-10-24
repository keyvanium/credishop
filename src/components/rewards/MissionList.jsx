import { CheckCircle2, Loader2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MissionList({ missions, onClaim, busyId }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-4">
      <header className="mb-3">
        <p className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
          <Target className="h-4 w-4 text-primary" />
          ماموریت‌های امتیازآور
        </p>
        <p className="text-[11px] text-muted-foreground">هر ماموریت یک بار قابل دریافت است و با فعالیت واقعی شما باز می‌شود</p>
      </header>

      <div className="space-y-2">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-foreground">{mission.title}</p>
              <p className="truncate text-[10px] text-muted-foreground">{mission.note}</p>
            </div>
            {mission.done ? (
              <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                دریافت شد
              </span>
            ) : (
              <Button
                size="sm"
                variant={mission.ready ? 'default' : 'outline'}
                disabled={!mission.ready || busyId === mission.id}
                onClick={() => onClaim(mission)}
                className="shrink-0 gap-1 text-[11px]"
              >
                {busyId === mission.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {mission.ready ? `${mission.points} امتیاز` : `${mission.points} امتیاز`}
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}