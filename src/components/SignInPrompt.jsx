import { LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignInPrompt({ title = 'برای ادامه وارد شوید', description, onSignIn }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <p className="font-heading text-base font-semibold text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-muted-foreground">
        {description || 'ثبت سفارش، معامله و مشاهده اطلاعات مالی به حساب کاربری شما گره خورده است. مرور بازار و فروشگاه بدون ورود هم ممکن است.'}
      </p>
      <Button className="mt-4 gap-2" onClick={onSignIn}>
        <LogIn className="h-4 w-4" />
        ورود یا ثبت‌نام
      </Button>
    </div>
  );
}