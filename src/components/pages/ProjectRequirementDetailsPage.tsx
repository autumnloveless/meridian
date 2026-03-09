import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { useCoState } from "jazz-tools/react";

import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Project } from "@/schema";
import { deleteRequirementById, findRequirement, type LoadedRequirement } from "@/components/requirements/requirementTreeUtils";

const statusOptions: LoadedRequirement["status"][] = [
  "Defined",
  "In Development",
  "In Testing",
  "Completed",
  "Archived",
];

export const ProjectRequirementDetailsPage = () => {
  const { orgId, projectId, requirementId } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = useCoState(Project, projectId, {
    resolve: {
      requirements: {
        $each: {
          details: true,
          children: {
            $each: {
              details: true,
              children: {
                $each: {
                  details: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const requirement = useMemo(() => {
    if (!project.$isLoaded || !requirementId) return null;
    return findRequirement(project.requirements.map((item) => item), requirementId);
  }, [project, requirementId]);

  if (!orgId || !projectId || !requirementId) {
    return <div className="text-sm text-red-700">Invalid requirement URL.</div>;
  }

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading requirement...</div>;
  }

  if (!requirement) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">Requirement not found.</p>
        <Button asChild variant="outline">
          <Link to={`/organizations/${orgId}/projects/${projectId}/requirements`}>Back to Requirements</Link>
        </Button>
      </section>
    );
  }

  const details = requirement.details.$isLoaded ? requirement.details.toString() : "";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirement</p>
          <h2 className="text-xl font-semibold">{requirement.name || "Untitled requirement"}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/organizations/${orgId}/projects/${projectId}/requirements`}>Back</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Requirement actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requirement Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</span>
            <Input value={requirement.name} onChange={(event) => requirement.$jazz.set("name", event.target.value)} />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={requirement.status}
                onChange={(event) => requirement.$jazz.set("status", event.target.value as LoadedRequirement["status"])}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version</span>
              <Input
                type="number"
                min={1}
                value={requirement.version}
                onChange={(event) => requirement.$jazz.set("version", Math.max(1, Number(event.target.value || 1)))}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</span>
            <textarea
              className="min-h-[240px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={details}
              onChange={(event) => requirement.details.$isLoaded && requirement.details.$jazz.applyDiff(event.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete requirement"
        description="This will permanently remove the requirement and its children."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          deleteRequirementById(project.requirements, requirement.$jazz.id);
          navigate(`/organizations/${orgId}/projects/${projectId}/requirements`);
        }}
      />
    </section>
  );
};