import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/react";

import "./index.css"
import { ThemeProvider } from "@/components/wrappers/theme-provider"
import { AppErrorBoundary } from "@/components/wrappers/AppErrorBoundary"
import { JazzWrapper } from "@/components/wrappers/JazzWrapper";
import { Router } from "@/Router";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '';
if (!CLERK_PUBLISHABLE_KEY.trim()) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in environment.");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
          <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
            <JazzWrapper>
              <Router />
            </JazzWrapper>
          </ClerkProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>
)
