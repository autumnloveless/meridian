import { Outlet } from "react-router";
import { Header } from "@/components/ui/header";
import { InviteHandler } from "@/components/wrappers/InviteHandler";
import { AppBreadcrumbs } from "@/components/navigation/AppBreadcrumbs";

export const BaseLayout = () => {
  return (
    <div className="flex min-h-dvh min-h-screen flex-col">
      <Header />
      <div className="border-b bg-background px-3 py-2 sm:px-6 lg:px-8">
        <AppBreadcrumbs />
      </div>
      <InviteHandler />
      <main className="relative flex min-h-0 flex-1 bg-stone-100">
        <div className="flex h-full min-h-0 w-full flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};