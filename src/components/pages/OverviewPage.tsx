import { Link } from "react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const OverviewPage = () => {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-3 p-3 sm:space-y-4 sm:p-4 md:p-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg sm:text-xl">Workspace Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Jump into organizations and recent workstreams from one place.</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link className="rounded-md border border-border/70 px-3 py-2 text-foreground hover:bg-muted" to="/organizations">
              Open organizations
            </Link>
            <Link className="rounded-md border border-border/70 px-3 py-2 text-foreground hover:bg-muted" to="/tags">
              Browse tags
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};