import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Organization } from "@/schema";

export const OrganizationOverviewPage = () => {
  const { orgId } = useParams();
  const organization = useCoState(Organization, orgId, {
    resolve: { overview: true },
  });

  const [draft, setDraft] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!organization.$isLoaded) return;
    const current = organization.overview.toString();
    setDraft(current);
    setLastSaved(current);
  }, [organization.$isLoaded, organization.$isLoaded ? organization.overview.toString() : ""]);

  useEffect(() => {
    if (!organization.$isLoaded || draft === lastSaved) return;

    const timeout = window.setTimeout(async () => {
      setIsSaving(true);
      try {
        const loaded = await organization.$jazz.ensureLoaded({ resolve: { overview: true } });
        loaded.overview.$jazz.applyDiff(draft);
        setLastSaved(draft);
      } finally {
        setIsSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [organization, draft, lastSaved]);

  if (!orgId) return <div className="text-sm text-red-700">Invalid organization URL.</div>;
  if (!organization.$isLoaded) return <div className="text-sm text-muted-foreground">Loading organization summary...</div>;

  return (
    <section className="space-y-3 p-1 sm:space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Organization Summary</h2>
        <p className="text-sm text-muted-foreground">Shared context and status for this organization.</p>
      </header>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="min-h-[300px] w-full resize-y rounded-md border bg-background p-3 text-sm"
        placeholder="Write an overview for this organization..."
      />

      <p className="text-xs text-muted-foreground">{isSaving ? "Saving..." : draft === lastSaved ? "All changes saved" : "Unsaved changes"}</p>
    </section>
  );
};
