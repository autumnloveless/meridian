import { Outlet } from "react-router";
import { Header } from "@/components/ui/header";

export const BaseLayout = () => {

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="relative min-h-0 flex-1 bg-stone-100">
        <div>
          <Outlet />
        </div>


      </main>
    </div>
  );
};