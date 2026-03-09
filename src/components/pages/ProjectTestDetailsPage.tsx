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
import { deleteTestById, findTest } from "@/components/tests/testTreeUtils";

export const ProjectTestDetailsPage = () => {
  const { orgId, projectId, testId } = useParams();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = useCoState(Project, projectId, {
    resolve: {
      tests: {
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

  const test = useMemo(() => {
    if (!project.$isLoaded || !testId) return null;
    return findTest(project.tests.map((item) => item), testId);
  }, [project, testId]);

  if (!orgId || !projectId || !testId) {
    return <div className="text-sm text-red-700">Invalid test URL.</div>;
  }

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading test...</div>;
  }

  if (!test) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted-foreground">Test not found.</p>
        <Button asChild variant="outline">
          <Link to={`/organizations/${orgId}/projects/${projectId}/tests`}>Back to Tests</Link>
        </Button>
      </section>
    );
  }

  const details = test.details.$isLoaded ? test.details.toString() : "";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test</p>
          <h2 className="text-xl font-semibold">{test.name || "Untitled test"}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/organizations/${orgId}/projects/${projectId}/tests`}>Back</Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="icon-sm" aria-label="Test actions">
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
          <CardTitle>Test Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</span>
            <Input value={test.name} onChange={(event) => test.$jazz.set("name", event.target.value)} />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Version</span>
              <Input
                type="number"
                min={1}
                value={test.version}
                onChange={(event) => test.$jazz.set("version", Math.max(1, Number(event.target.value || 1)))}
              />
            </label>

            <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={test.is_folder}
                onChange={(event) => test.$jazz.set("is_folder", event.target.checked)}
              />
              Folder
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Details</span>
            <textarea
              className="min-h-[240px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={details}
              onChange={(event) => test.details.$isLoaded && test.details.$jazz.applyDiff(event.target.value)}
            />
          </label>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete test"
        description="This will permanently remove the test and its children."
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={() => {
          deleteTestById(project.tests, test.$jazz.id);
          navigate(`/organizations/${orgId}/projects/${projectId}/tests`);
        }}
      />
    </section>
  );
};