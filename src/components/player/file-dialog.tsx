import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/use-i18n";

interface FileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  titleKey: "openVideoTitle" | "loadSubtitleTitle";
  descKey: "openVideoDesc" | "loadSubtitleDesc";
}

export function FileDialog({
  open,
  onOpenChange,
  onConfirm,
  titleKey,
  descKey,
}: FileDialogProps) {
  const t = useT();

  const handleConfirm = () => {
    onOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl p-8">
        <DialogHeader className="gap-3">
          <DialogTitle className="text-xl font-semibold">
            {t(titleKey)}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            {t(descKey)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-3 border-t-0 bg-transparent p-0 sm:flex-row">
          <DialogClose asChild>
            <Button variant="outline" className="border-zinc-700 text-zinc-400">
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            className="bg-[#8b5cf6] text-white hover:bg-[#7c3aed]"
            onClick={handleConfirm}
          >
            {t("selectFile")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}