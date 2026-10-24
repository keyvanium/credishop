import { useEffect, useState } from 'react';
import { loadSettings } from '@/lib/engine';
import { SETTING_DEFAULTS } from '@/lib/engine';

export default function usePlatformSettings() {
  const [settings, setSettings] = useState(SETTING_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadSettings()
      .then((next) => active && setSettings(next))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}