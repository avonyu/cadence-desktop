import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useActivationStore } from "@/stores/activation-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface ActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUPS = 4;
const GROUP_LENGTH = 4;
const TOTAL_LENGTH = GROUPS * GROUP_LENGTH;

export function ActivationDialog({ open, onOpenChange }: ActivationDialogProps) {
  const { t } = useTranslation();
  const activate = useActivationStore((s) => s.activate);
  const [values, setValues] = useState<string[]>(Array(GROUPS).fill(""));
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const resetForm = useCallback(() => {
    setValues(Array(GROUPS).fill(""));
    setStatus("idle");
  }, []);

  const handleChange = (groupIndex: number, value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const truncated = cleaned.slice(0, GROUP_LENGTH);
    const newValues = [...values];
    newValues[groupIndex] = truncated;
    setValues(newValues);
    setStatus("idle");

    if (truncated.length === GROUP_LENGTH && groupIndex < GROUPS - 1) {
      inputRefs.current[groupIndex + 1]?.focus();
    }
  };

  const handleKeyDown = (
    groupIndex: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && values[groupIndex] === "" && groupIndex > 0) {
      inputRefs.current[groupIndex - 1]?.focus();
    }
    if (e.key === "ArrowRight" && groupIndex < GROUPS - 1) {
      inputRefs.current[groupIndex + 1]?.focus();
    }
    if (e.key === "ArrowLeft" && groupIndex > 0) {
      inputRefs.current[groupIndex - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const newValues = [...values];
    for (let i = 0; i < GROUPS; i++) {
      newValues[i] = raw.slice(i * GROUP_LENGTH, (i + 1) * GROUP_LENGTH);
    }
    setValues(newValues);
  };

  const handleSubmit = async () => {
    const code = values.join("-");
    if (code.replace(/-/g, "").length !== TOTAL_LENGTH) {
      return;
    }

    setSubmitting(true);
    setStatus("idle");

    try {
      const result = await activate(code);
      if (result.success) {
        setStatus("success");
        toast.success(t("activation.activateSuccess"));
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 1500);
      } else {
        setStatus("error");
        toast.error(result.error || t("activation.invalidCode"));
      }
    } catch {
      setStatus("error");
      toast.error(t("activation.invalidCode"));
    } finally {
      setSubmitting(false);
    }
  };

  const isComplete = values.every((v) => v.length === GROUP_LENGTH);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("activation.title")}</DialogTitle>
          <DialogDescription>
            {t("activation.codePlaceholder")}
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {t("activation.activateSuccess")}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div
              className="flex items-center justify-center gap-2"
              onPaste={handlePaste}
            >
              {Array.from({ length: GROUPS }).map((_, gi) => (
                <span key={gi} className="flex items-center gap-2">
                  {gi > 0 && <span className="text-muted-foreground">-</span>}
                  <input
                    ref={(el) => { inputRefs.current[gi] = el; }}
                    type="text"
                    maxLength={GROUP_LENGTH}
                    value={values[gi]}
                    onChange={(e) => handleChange(gi, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(gi, e)}
                    className={`w-12 h-12 text-center text-lg font-mono rounded-md border bg-transparent outline-none transition
                      ${status === "error"
                        ? "border-red-500 focus-visible:ring-red-500/50"
                        : "border-input focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      }`}
                    autoFocus={gi === 0}
                  />
                </span>
              ))}
            </div>

            <Button
              className="w-full"
              disabled={!isComplete || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : null}
              {submitting
                ? t("activation.activating")
                : t("activation.activateButton")}
            </Button>

            {status === "error" && (
              <div className="flex items-center justify-center gap-1.5 text-sm text-red-500">
                <X size={14} />
                {t("activation.invalidCode")}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
