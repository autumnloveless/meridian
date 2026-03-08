import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAuth } from "./user";
import { useAgent, useIsAuthenticated } from "jazz-tools/react";

const topLevelNavItems = [
  { label: "Overview", to: "/overview" },
  { label: "Projects", to: "/projects" },
  { label: "People", to: "/people" },
];

export const Header = () => {
  const agent = useAgent();
  const isAuthenticated = useIsAuthenticated();
  const isAnonymous = agent.$type$ === "Account" && !isAuthenticated;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            to="/overview"
            className="text-lg font-semibold text-foreground transition-colors hover:text-primary"
            aria-label="Meridian home"
          >
            Meridian
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
            {topLevelNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <Button
              variant="ghost"
              className="sm:hidden"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-controls="mobile-nav-menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen ? <X /> : <Menu />}
            </Button>
          </div>
          <UserAuth />
        </div>
      </div>

      {isAnonymous && (
        <div className="border-t border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-center text-xs font-medium text-amber-800 dark:text-amber-200 sm:px-6 lg:px-8">
          You are browsing anonymously. Log in to enable sync and back up your data.
        </div>
      )}

      {isMobileMenuOpen && (
        <div id="mobile-nav-menu" className="border-t border-border/70 px-4 py-3 sm:hidden">
          <nav aria-label="Primary mobile" className="mx-auto flex w-full max-w-6xl flex-col gap-2">
            {topLevelNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};