"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { createContext, ReactNode, useCallback, useContext, useMemo } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// `signedIn` comes from the server session in the root layout (there's no client SessionProvider).
const SignedInContext = createContext(false);

/** Hands Convex a short-lived token from /api/convex/token so its functions know who is calling. */
function useTournlerAuth() {
  const signedIn = useContext(SignedInContext);
  const fetchAccessToken = useCallback(async () => {
    if (!signedIn) return null;
    try {
      const response = await fetch("/api/convex/token", { cache: "no-store" });
      if (!response.ok) return null;
      const { token } = (await response.json()) as { token: string };
      return token;
    } catch {
      return null;
    }
  }, [signedIn]);

  return useMemo(() => ({ isLoading: false, isAuthenticated: signedIn, fetchAccessToken }), [signedIn, fetchAccessToken]);
}

export function ConvexClientProvider({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  return (
    <SignedInContext.Provider value={signedIn}>
      <ConvexProviderWithAuth client={convex} useAuth={useTournlerAuth}>
        {children}
      </ConvexProviderWithAuth>
    </SignedInContext.Provider>
  );
}
