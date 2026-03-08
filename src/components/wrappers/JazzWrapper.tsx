import { JazzReactProviderWithClerk } from "jazz-tools/react";
import { Account } from "@/schema";
import { useClerk } from "@clerk/react";

const apiKey = import.meta.env.VITE_JAZZ_API_KEY;
const JazzProvider = JazzReactProviderWithClerk as unknown as React.ComponentType<any>;

export function JazzWrapper({ children }: { children: React.ReactNode }) {
  const clerk = useClerk();

  return (
    <JazzProvider
      clerk={clerk}
      sync={{
        peer: `wss://cloud.jazz.tools/?key=${apiKey}`,
        when: "signedUp",
      }}
      AccountSchema={Account}
    >
      {children}
    </JazzProvider>
  );
}