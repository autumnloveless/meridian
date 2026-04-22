import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createUserDataExportFile, downloadUserDataExport } from "@/lib/userDataExport";

type UserProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: any;
  displayName: string;
};

export const UserProfileDialog = ({
  open,
  onOpenChange,
  account,
  displayName,
}: UserProfileDialogProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) return;
    setIsExporting(false);
    setErrorMessage(null);
  }, [open]);

  const accountId = account?.$isLoaded ? account.$jazz.id : null;
  const profileId = account?.$isLoaded && account.profile?.$isLoaded ? account.profile.$jazz.id : null;

  const handleExport = async () => {
    if (!account?.$isLoaded) return;

    setIsExporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const file = await createUserDataExportFile(account);
      downloadUserDataExport(file);

      const { summary } = file.payload;
      setSuccessMessage(
        `Downloaded ${file.fileName} with ${summary.organizations} organizations, ${summary.projects} projects, and ${summary.tasks} tasks.`,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The export could not be generated.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
          <DialogDescription>
            Export your Meridian Jazz v1 data as a plain minified JSON snapshot for one-time migration into a new system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="font-medium text-foreground">Account context</p>
            <dl className="mt-2 space-y-1 text-muted-foreground">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="min-w-24 font-medium text-foreground">Account ID</dt>
                <dd className="break-all">{accountId ?? "Loading..."}</dd>
              </div>
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="min-w-24 font-medium text-foreground">Profile ID</dt>
                <dd className="break-all">{profileId ?? "Unavailable"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-muted-foreground">
            <p>
              The downloaded file is plain JSON for easier inspection and debugging. It includes legacy IDs, ownership references, navigation state, and nested project data.
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-lg border border-emerald-300/60 bg-emerald-50 p-3 text-sm text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={() => void handleExport()} disabled={!account?.$isLoaded || isExporting}>
              {isExporting ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isExporting ? "Preparing export..." : "Export data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};