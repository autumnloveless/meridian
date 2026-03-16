import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { useCoState } from "jazz-tools/react";

import { Document } from "@/schema";
import { handleTextareaTabKey } from "@/lib/utils";

const absoluteDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const formatAbsoluteTimestamp = (value: number) => {
  return absoluteDateFormatter.format(new Date(value));
};

const formatRelativeTimestamp = (value: number, now: number) => {
  const diffMs = value - now;
  const diffMinutes = Math.round(diffMs / 60000);
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMs / 3600000);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffMs / 86400000);
  return relativeTimeFormatter.format(diffDays, "day");
};

export const DocumentEditorPage = () => {
  const { docId } = useParams();
  const document = useCoState(Document, docId);
  const remoteTitle = document.$isLoaded ? document.name : "";
  const remoteContent = document.$isLoaded ? document.content : "";

  const [draftTitle, setDraftTitle] = useState("");
  const [lastSavedTitle, setLastSavedTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const latestTitleRef = useRef("");
  const latestContentRef = useRef("");

  useEffect(() => {
    latestTitleRef.current = draftTitle;
  }, [draftTitle]);

  useEffect(() => {
    latestContentRef.current = draftContent;
  }, [draftContent]);

  useEffect(() => {
    if (!document.$isLoaded) return;

    setDraftTitle(remoteTitle);
    setLastSavedTitle(remoteTitle);
    setDraftContent(remoteContent);
    setLastSavedContent(remoteContent);
    setSaveError(null);
  }, [document.$isLoaded, remoteTitle, remoteContent]);

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
      document.$jazz.set("content", nextContent);
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  if (!docId) return <div className="text-sm text-red-700">Invalid document URL.</div>;
  if (!document.$isLoaded) return <div className="text-sm text-muted-foreground">Loading document...</div>;

  const effectiveUpdatedAt = document.$jazz.lastUpdatedAt;

  return (
    <section className="flex h-full min-h-[calc(100dvh-8rem)] flex-col bg-background">
      <header className="px-3 pb-3 pt-2 sm:px-6">
        <input
          value={draftTitle}
          onChange={(event) => {
            setDraftTitle(event.target.value);
            setSaveError(null);
          }}
          onBlur={() => {
            void saveTitle();
          }}
          className="w-full bg-transparent text-xl font-semibold outline-none sm:text-2xl"
          placeholder="Untitled page"
        />
      </header>

      <div className="flex-1 pb-4 px-3 sm:px-6">
        <textarea
          value={draftContent}
          onChange={(event) => {
            setDraftContent(event.target.value);
            setSaveError(null);
          }}
          onKeyDown={(event) => {
            handleTextareaTabKey(event, setDraftContent);
            setSaveError(null);
          }}
          onBlur={() => {
            void saveContent();
          }}
          className="h-full min-h-[18rem] w-full resize-none rounded-md border bg-background p-3 text-sm leading-6 outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          placeholder="Write your notes here..."
        />
      </div>

      <footer className="flex flex-col items-start justify-between gap-1 border-t px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="min-w-0">
          <span>
            {isSaving
              ? "Saving..."
              : draftTitle !== lastSavedTitle || draftContent !== lastSavedContent
                ? "Unsaved changes"
                : "All changes saved"}
          </span>
          {saveError ? <p className="text-red-700">{saveError}</p> : null}
        </div>

        <div className="shrink-0 leading-relaxed sm:text-right">
          <p>Created: {formatAbsoluteTimestamp(document.$jazz.createdAt)}</p>
          <p>Last updated: {formatRelativeTimestamp(effectiveUpdatedAt, now)}</p>
        </div>
      </footer>
    </section>
  );
};
