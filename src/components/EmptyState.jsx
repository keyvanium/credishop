import { Inbox } from 'lucide-react';

export default function EmptyState({ title, description, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="mx-auto max-w-sm text-xs leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}