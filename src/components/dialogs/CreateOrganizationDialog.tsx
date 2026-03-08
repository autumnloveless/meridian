import { type SubmitEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type CreateOrganizationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
};

export const CreateOrganizationDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: CreateOrganizationDialogProps) => {
  const [organizationName, setOrganizationName] = useState("");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = organizationName.trim();
    if (!name) {
      return;
    }

    onSubmit(name);
    setOrganizationName("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setOrganizationName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>Add a new organization to group related projects.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="organization-name" className="text-sm font-medium text-stone-700">
              Organization name
            </label>
            <Input
              id="organization-name"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Acme Inc"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">Save Organization</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
