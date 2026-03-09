import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  showCancel?: boolean;
  isConfirmDisabled?: boolean;
};

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  confirmVariant = "default",
  showCancel = true,
  isConfirmDisabled = false,
}: ConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          {showCancel ? (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {cancelText}
            </Button>
          ) : null}
          <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={isConfirmDisabled}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
