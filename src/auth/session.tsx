import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { createApiClient, type ApiClient } from '../api/client';
import { env } from '../config/env';

/**
 * Session context: the authenticated API client plus the cache scope.
 *
 * CACHE ISOLATION. Every tenant-sensitive query key begins with `scope`
 * (`<clerkUserId>:<activeOrgId|none>`). Whenever the scope changes — sign-out,
 * a different person signing in, or switching landlord organisation — this
 * provider renders nothing for one pass, clears the ENTIRE query cache before
 * paint, then remounts the tree under the new scope. Clearing rather than
 * invalidating is deliberate: invalidation keeps old data on screen while it
 * refetches, which is exactly the "Organisation A's rent roll visible under
 * B" leak to avoid.
 */

export interface SessionValue {
  api: ApiClient;
  scope: string;
  userId: string;
  orgId: string | null;
  /** True after the backend rejected the session; UI offers re-auth. */
  sessionRejected: boolean;
  acknowledgeRejection: () => void;
  /** Forces a new backend token, e.g. after onboarding binds an organisation. */
  refreshToken: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function scopeFor(userId: string | null | undefined, orgId: string | null | undefined): string {
  return userId ? `${userId}:${orgId ?? 'none'}` : 'signed-out';
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { getToken, userId, orgId, isLoaded } = useAuth();
  const queryClient = useQueryClient();
  const [sessionRejected, setSessionRejected] = useState(false);

  const scope = scopeFor(userId, orgId);
  const [readyScope, setReadyScope] = useState(scope);

  useLayoutEffect(() => {
    if (readyScope !== scope) {
      queryClient.clear();
      setReadyScope(scope);
      setSessionRejected(false);
    }
  }, [scope, readyScope, queryClient]);

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const api = useMemo(
    () =>
      createApiClient(
        (opts) => getTokenRef.current({ template: env.clerkJwtTemplate, skipCache: opts?.skipCache }),
        () => setSessionRejected(true),
      ),
    [],
  );

  const refreshToken = useCallback(async () => {
    await getTokenRef.current({ template: env.clerkJwtTemplate, skipCache: true });
  }, []);

  const acknowledgeRejection = useCallback(() => setSessionRejected(false), []);

  const value = useMemo<SessionValue | null>(
    () =>
      userId
        ? { api, scope, userId, orgId: orgId ?? null, sessionRejected, acknowledgeRejection, refreshToken }
        : null,
    [api, scope, userId, orgId, sessionRejected, acknowledgeRejection, refreshToken],
  );

  if (isLoaded && readyScope !== scope) {
    return null;
  }

  return (
    <SessionContext.Provider value={value}>
      <React.Fragment key={scope}>{children}</React.Fragment>
    </SessionContext.Provider>
  );
}

/** For signed-in screens. Throws if used where no session exists. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession used outside a signed-in screen');
  }
  return value;
}

/** For components that render in both states (banners, routers). */
export function useOptionalSession(): SessionValue | null {
  return useContext(SessionContext);
}
