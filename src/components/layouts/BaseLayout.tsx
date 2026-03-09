import { Outlet } from "react-router";
import { Header } from "@/components/ui/header";
import { InviteHandler } from "@/components/wrappers/InviteHandler";

export const BaseLayout = () => {

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <InviteHandler />
      <main className="relative min-h-0 flex-1 bg-stone-100">
        <div>
          <Outlet />
        </div>


      </main>
    </div>
  );
};