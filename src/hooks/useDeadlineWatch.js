import { useEffect, useRef } from 'react';
import { reconcileDeadlines } from '@/lib/engine';

// پایش مهلت‌ها هنگام حضور کاربر: انقضای مهلت پرداخت، تحویل و تأیید را ثبت می‌کند
export default function useDeadlineWatch({ user, profile, isAdmin, enabled = true }) {
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || !user?.id || ran.current) return;
    ran.current = true;
    reconcileDeadlines({ user, profile, isAdmin }).catch(() => {});
  }, [enabled, user, profile, isAdmin]);
}