import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Project, TaskBucket } from "@/schema";

type BucketType = "Active" | "Backlog" | "Custom";

export const ProjectTasksListPage = () => {
  const { projectId } = useParams();
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editingBucketName, setEditingBucketName] = useState("");

  const project = useCoState(Project, projectId, {
    resolve: {
      task_buckets: {
        $each: {
          tasks: { $each: true },
        },
      },
    },
  });

  useEffect(() => {
    if (!project.$isLoaded) return;

    const hasActive = project.task_buckets.some((bucket) => bucket.type === "Active");
    const hasBacklog = project.task_buckets.some((bucket) => bucket.type === "Backlog");

    if (!hasActive) {
      project.task_buckets.$jazz.push(
        TaskBucket.create({
          name: "Active",
          type: "Active",
          order: 0,
          tasks: [],
        })
      );
    }

    if (!hasBacklog) {
      project.task_buckets.$jazz.push(
        TaskBucket.create({
          name: "Backlog",
          type: "Backlog",
          order: 9999,
          tasks: [],
        })
      );
    }
  }, [project]);

  const orderedBuckets = useMemo(() => {
    if (!project.$isLoaded) return [];

    const active = project.task_buckets.find((bucket) => bucket.type === "Active");
    const backlog = project.task_buckets.find((bucket) => bucket.type === "Backlog");
    const custom = project.task_buckets
      .filter((bucket) => bucket.type === "Custom")
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));

    const buckets = [active, ...custom, backlog].filter((bucket): bucket is typeof custom[number] => Boolean(bucket));
    return buckets;
  }, [project]);

  const customBuckets = useMemo(
    () => orderedBuckets.filter((bucket) => bucket.type === "Custom"),
    [orderedBuckets]
  );

  if (!project.$isLoaded) {
    return <div className="text-sm text-muted-foreground">Loading task backlog...</div>;
  }

  const createCustomBucket = () => {
    const nextIndex = customBuckets.length + 1;
    project.task_buckets.$jazz.push(
      TaskBucket.create({
        name: `Bucket ${nextIndex}`,
        type: "Custom",
        order: nextIndex,
        tasks: [],
      })
    );
  };

  const startEditBucket = (bucketId: string, currentName: string) => {
    setEditingBucketId(bucketId);
    setEditingBucketName(currentName);
  };

  const saveBucketName = () => {
    if (!editingBucketId) return;
    const nextName = editingBucketName.trim();
    if (!nextName) return;

    const bucket = project.task_buckets.find((item) => item.$jazz.id === editingBucketId);
    if (!bucket || bucket.type !== "Custom") return;

    bucket.$jazz.set("name", nextName);
    setEditingBucketId(null);
    setEditingBucketName("");
  };

  const cancelEditBucket = () => {
    setEditingBucketId(null);
    setEditingBucketName("");
  };

  const removeCustomBucket = (bucketId: string) => {
    project.task_buckets.$jazz.remove((bucket) => bucket.$jazz.id === bucketId && bucket.type === "Custom");

    const remaining = project.task_buckets
      .filter((bucket) => bucket.type === "Custom")
      .sort((left, right) => left.order - right.order);

    remaining.forEach((bucket, index) => {
      bucket.$jazz.set("order", index + 1);
    });

    if (editingBucketId === bucketId) {
      cancelEditBucket();
    }
  };

  const moveCustomBucket = (bucketId: string, direction: "up" | "down") => {
    const orderedCustomIds = customBuckets.map((bucket) => bucket.$jazz.id);
    const currentIndex = orderedCustomIds.findIndex((id) => id === bucketId);
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedCustomIds.length) return;

    const nextIds = [...orderedCustomIds];
    [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

    nextIds.forEach((id, index) => {
      const bucket = project.task_buckets.find((item) => item.$jazz.id === id);
      if (bucket && bucket.type === "Custom") {
        bucket.$jazz.set("order", index + 1);
      }
    });
  };

  const renderBucketHeader = (bucket: (typeof orderedBuckets)[number]) => {
    const isCustom = bucket.type === "Custom";
    const customIndex = customBuckets.findIndex((item) => item.$jazz.id === bucket.$jazz.id);
    const isEditing = editingBucketId === bucket.$jazz.id;

    return (
      <div className="flex items-center justify-between gap-2">
        {isEditing ? (
          <div className="flex w-full items-center gap-2">
            <Input
              value={editingBucketName}
              onChange={(event) => setEditingBucketName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveBucketName();
                if (event.key === "Escape") cancelEditBucket();
              }}
              className="h-8"
              autoFocus
            />
            <Button size="sm" onClick={saveBucketName}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEditBucket}>
              Cancel
            </Button>
          </div>
        ) : (
          <CardTitle>{bucket.name}</CardTitle>
        )}

        {!isEditing ? (
          <div className="ml-auto flex items-center gap-1">
            {bucket.type === "Backlog" ? (
              <Button size="sm" variant="outline" onClick={createCustomBucket}>
                Create new bucket
              </Button>
            ) : null}

            {isCustom ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveCustomBucket(bucket.$jazz.id, "up")}
                  disabled={customIndex <= 0}
                  aria-label={`Move ${bucket.name} up`}
                >
                  Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => moveCustomBucket(bucket.$jazz.id, "down")}
                  disabled={customIndex < 0 || customIndex >= customBuckets.length - 1}
                  aria-label={`Move ${bucket.name} down`}
                >
                  Down
                </Button>
                <Button size="sm" variant="outline" onClick={() => startEditBucket(bucket.$jazz.id, bucket.name)}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => removeCustomBucket(bucket.$jazz.id)}>
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Task Backlog</h2>
        <p className="text-sm text-muted-foreground">Tasks are grouped by buckets. Active stays at the top and Backlog stays at the bottom.</p>
      </div>

      <div className="space-y-4">
        {orderedBuckets.map((bucket) => (
          <Card key={bucket.$jazz.id}>
            <CardHeader className="border-b">{renderBucketHeader(bucket)}</CardHeader>
            <CardContent className="pt-4">
              {bucket.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks in this bucket.</p>
              ) : (
                <ul className="space-y-2">
                  {bucket.tasks.map((task) => (
                    <li key={task.$jazz.id} className="rounded-md border px-3 py-2 text-sm">
                      {task.summary}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};