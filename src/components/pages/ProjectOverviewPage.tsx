import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCoState } from "jazz-tools/react";

import { Project } from "@/schema";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

export const ProjectOverviewPage = () => {
  const { projectId } = useParams();
  const project = useCoState(Project, projectId);

  const editor = useCreateBlockNote();
  const [draftOverview, setDraftOverview] = useState("");
  const [lastSavedOverview, setLastSavedOverview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const latestOverviewRef = useRef("");
  const isHydratingEditorRef = useRef(false);

  useEffect(() => {
    latestOverviewRef.current = draftOverview;
  }, [draftOverview]);

  useEffect(() => {
    if (!project.$isLoaded) return;

    const overview = project.overview.toString();
    setDraftOverview(overview);
    setLastSavedOverview(overview);
    setSaveError(null);
  }, [project]);

  useEffect(() => {
    if (!project.$isLoaded) return;

    let canceled = false;

    const hydrateEditor = async () => {
      isHydratingEditorRef.current = true;
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(project.overview.toString());
        if (canceled) return;
        editor.replaceBlocks(editor.document, blocks.length > 0 ? blocks : []);
      } finally {
        if (!canceled) isHydratingEditorRef.current = false;
      }
    };

    void hydrateEditor();

    return () => {
      canceled = true;
    };
  }, [project, editor]);

  const saveOverview = useCallback(async () => {
    if (!project.$isLoaded) return;

    const nextOverview = latestOverviewRef.current;
    if (nextOverview === lastSavedOverview) return;

    setIsSaving(true);
    try {
      const loadedProject = await project.$jazz.ensureLoaded({ resolve: { overview: true } });
      if (!loadedProject.overview.$isLoaded) return;
      loadedProject.overview.$jazz.applyDiff(nextOverview);
      setLastSavedOverview(nextOverview);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save summary.");
    } finally {
      setIsSaving(false);
    }
  }, [project, lastSavedOverview]);

  useEffect(() => {
    if (!project.$isLoaded || draftOverview === lastSavedOverview) return;

    const timeout = window.setTimeout(() => {
      void saveOverview();
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [project, draftOverview, lastSavedOverview, saveOverview]);

  if (!projectId) return <div className="text-sm text-red-700">Invalid project URL.</div>;
  if (!project.$isLoaded) return <div className="text-sm text-muted-foreground">Loading project summary...</div>;

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold">Project Summary</h2>
        <p className="text-sm text-muted-foreground">Quick project context and status notes.</p>
      </header>

      <div className="h-[30vh] min-h-[220px] max-h-[33vh] overflow-hidden rounded-md border bg-background">
        <BlockNoteView
          editor={editor}
          onChange={async () => {
            if (isHydratingEditorRef.current) return;

            try {
              const markdown = await editor.blocksToMarkdownLossy(editor.document);
              setDraftOverview(markdown);
              setSaveError(null);
            } catch (error) {
              setSaveError(error instanceof Error ? error.message : "Unable to read summary content.");
            }
          }}
          className="h-full blocknote-readable-links"
        />
      </div>

      <footer className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isSaving
            ? "Saving..."
            : draftOverview !== lastSavedOverview
              ? "Unsaved changes"
              : "All changes saved"}
        </span>
        {saveError ? <span className="text-red-700">{saveError}</span> : null}
      </footer>
    </section>
  );
};