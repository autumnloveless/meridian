import { useEffect, useMemo, useState, type ReactNode } from "react";
import { JazzProvider, useLocalFirstAuth } from "jazz-tools/react";

type DbConfig = {
  appId: string;
  serverUrl: string;
  secret?: string;
  jwtToken?: string;
};

async function getFreshJwt(): Promise<string | null> {
  return null;
}

async function readCurrentJwt(): Promise<string | null> {
  return null;
}

function useExternalJwt() {
  const [jwt, setJwt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void readCurrentJwt().then((initialJwt) => {
      if (!isMounted) {
        return;
      }

      setJwt(initialJwt);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isLoading,
    jwt,
    refresh: async () => {
      const nextJwt = await getFreshJwt();
      setJwt(nextJwt);
      return nextJwt;
    },
  };
}

export function JazzAuthProvider({ children }: { children: ReactNode }) {
  const external = useExternalJwt();
  const { secret, isLoading: isLocalFirstLoading } = useLocalFirstAuth();

  const config = useMemo<DbConfig>(() => {
    return {
      appId: process.env.NEXT_PUBLIC_JAZZ_APP_ID ?? "",
      serverUrl: process.env.NEXT_PUBLIC_JAZZ_SERVER_URL ?? "",
      jwtToken: external.jwt ?? undefined,
      secret: external.jwt ? undefined : secret ?? undefined,
    };
  }, [external.jwt, secret]);

  if (external.isLoading || (!external.jwt && isLocalFirstLoading)) {
    return null;
  }

  return (
    <JazzProvider
      key={external.jwt ? "external" : "local-first"}
      config={config}
      onJWTExpired={external.refresh}
      fallback={null}
    >
      {children}
    </JazzProvider>
  );
}