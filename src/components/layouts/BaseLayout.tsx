import { Outlet } from "react-router";
import { Header } from "@/components/ui/header";
import { InviteHandler } from "@/components/wrappers/InviteHandler";
import { AppBreadcrumbs } from "@/components/navigation/AppBreadcrumbs";

export const BaseLayout = () => {
  return (
    <div className="app-atmosphere flex min-h-dvh min-h-screen flex-col">
      <Header />
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-40 border-b bg-background/90 px-3 py-2 backdrop-blur-md sm:top-[calc(env(safe-area-inset-top)+4rem)] sm:px-6 lg:px-8">
        <AppBreadcrumbs />
      </div>
      <InviteHandler />
      <main className="relative flex min-h-0 flex-1 bg-background/65">
        <div className="flex h-full min-h-0 w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};