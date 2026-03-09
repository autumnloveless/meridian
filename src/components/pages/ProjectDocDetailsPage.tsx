import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCoState } from "jazz-tools/react";

import { Document } from "@/schema";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

export const ProjectDocDetailsPage = () => {
  const { docId } = useParams();
  const document = useCoState(Document, docId);

  const editor = useCreateBlockNote();
  const [draftTitle, setDraftTitle] = useState("");
  const [lastSavedTitle, setLastSavedTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const latestTitleRef = useRef("");
  const latestContentRef = useRef("");
  const isHydratingEditorRef = useRef(false);

  useEffect(() => {
    latestTitleRef.current = draftTitle;
  }, [draftTitle]);

  useEffect(() => {
    latestContentRef.current = draftContent;
  }, [draftContent]);

  useEffect(() => {
    if (!document.$isLoaded) return;

    const content = document.content.toString();
    setDraftTitle(document.name);
    setLastSavedTitle(document.name);
    setDraftContent(content);
    setLastSavedContent(content);
    setSaveError(null);
  }, [document]);

  useEffect(() => {
    if (!document.$isLoaded) return;

    let canceled = false;

    const hydrateEditor = async () => {
      isHydratingEditorRef.current = true;
      try {
        const blocks = await editor.tryParseMarkdownToBlocks(document.content.toString());
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
  }, [document, editor]);

  const saveTitle = useCallback(async () => {
    if (!document.$isLoaded) return;

    const nextTitle = latestTitleRef.current.trim();
    if (!nextTitle || nextTitle === lastSavedTitle) return;

    setIsSaving(true);
    try {
      document.$jazz.set("name", nextTitle);
      setLastSavedTitle(nextTitle);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save title.");
    } finally {
      setIsSaving(false);
    }
  }, [document, lastSavedTitle]);

  const saveContent = useCallback(async () => {
    if (!document.$isLoaded) return;

    const nextContent = latestContentRef.current;
    if (nextContent === lastSavedContent) return;

    setIsSaving(true);
    try {
      document.content.$jazz.applyDiff(nextContent);
      setLastSavedContent(nextContent);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save content.");
    } finally {
      setIsSaving(false);
    }
  }, [document, lastSavedContent]);

  useEffect(() => {
    if (!document.$isLoaded || draftTitle.trim() === "" || draftTitle === lastSavedTitle) return;

    const timeout = window.setTimeout(() => {
      void saveTitle();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [document, draftTitle, lastSavedTitle, saveTitle]);

  useEffect(() => {
    if (!document.$isLoaded || draftContent === lastSavedContent) return;

    const timeout = window.setTimeout(() => {
      void saveContent();
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [document, draftContent, lastSavedContent, saveContent]);

  if (!docId) return <div className="text-sm text-red-700">Invalid document URL.</div>;
  if (!document.$isLoaded) return <div className="text-sm text-muted-foreground">Loading document...</div>;

  return (
    <section className="flex h-full min-h-[calc(100vh-9rem)] flex-col bg-background">
      <header className="px-6 pt-6 pb-3">
        <input
          value={draftTitle}
          onChange={(event) => {
            setDraftTitle(event.target.value);
            setSaveError(null);
          }}
          onBlur={() => {
            void saveTitle();
          }}
          className="w-full text-2xl font-semibold bg-transparent outline-none"
          placeholder="Untitled page"
        />
      </header>

      <div className="flex-1 px-4 pb-4">
        <BlockNoteView
          editor={editor}
          onChange={async () => {
            if (isHydratingEditorRef.current) return;

            try {
              const markdown = await editor.blocksToMarkdownLossy(editor.document);
              setDraftContent(markdown);
              setSaveError(null);
            } catch (error) {
              setSaveError(error instanceof Error ? error.message : "Unable to read editor content.");
            }
          }}
          className="h-full"
        />
      </div>

      <footer className="flex items-center justify-between px-6 py-2 text-xs text-muted-foreground border-t">
        <span>
          {isSaving
            ? "Saving..."
            : draftTitle !== lastSavedTitle || draftContent !== lastSavedContent
              ? "Unsaved changes"
              : "All changes saved"}
        </span>
        {saveError ? <span className="text-red-700">{saveError}</span> : null}
      </footer>
    </section>
  );
};
