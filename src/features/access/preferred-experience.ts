import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

import { useSession } from '../../auth/session';
import type { Experience } from './use-access';

/**
 * For people who are both a landlord and a renter: which experience to open
 * by default. A UI preference only — it is keyed by session scope and never
 * grants anything; the entry gate still checks it against backend access.
 */
const key = (scope: string) => `rm.experience.${scope.replace(/[^A-Za-z0-9._-]/g, '_')}`;

export function usePreferredExperience(): [Experience | null, (value: Experience) => Promise<void>, boolean] {
  const { scope } = useSession();
  const [value, setValue] = useState<Experience | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync(key(scope))
      .then((v) => {
        if (active && (v === 'landlord' || v === 'renter')) setValue(v);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [scope]);

  const set = useCallback(
    async (next: Experience) => {
      setValue(next);
      await SecureStore.setItemAsync(key(scope), next).catch(() => undefined);
    },
    [scope],
  );

  return [value, set, loaded];
}
