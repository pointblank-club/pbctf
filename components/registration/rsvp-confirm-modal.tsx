"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./button";
import { FormInput } from "./form-input";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { IdCard, BadgeCheck, AlertTriangle } from "lucide-react";

interface RsvpConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (idName: string) => Promise<void>;
  /** Previously submitted ID name, if any, prefilled so it's easy to just update. */
  initialIdName?: string;
}

export function RsvpConfirmModal({ isOpen, onClose, onConfirm, initialIdName = "" }: RsvpConfirmModalProps) {
  const [idName, setIdName] = useState(initialIdName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setIdName(initialIdName);
  }, [isOpen, initialIdName]);

  const trimmedName = idName.trim();
  const isUpdate = initialIdName.trim().length > 0;

  const handleConfirm = async () => {
    if (!trimmedName) return;
    setIsSubmitting(true);
    try {
      await onConfirm(trimmedName);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-surface-1 border border-[var(--border-default)] max-h-[85vh] overflow-y-auto shadow-modal">
        <AlertDialogHeader>
          <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-1.5">
            {"// CONFIRM_PARTICIPATION"}
          </div>
          <AlertDialogTitle className="text-ink flex items-center gap-2 font-heading">
            <IdCard className="w-4 h-4 text-brand" />
            {isUpdate ? "Update your participation" : "Confirm your participation"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-ink-secondary text-[13px]">
            {isUpdate
              ? "You can update your name as per ID anytime before the RSVP deadline."
              : "Enter your name exactly as it appears on your identification document."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2 flex flex-col gap-3">
          <FormInput
            label="Name as per ID"
            placeholder="e.g. Jane A. Doe"
            value={idName}
            onChange={(e) => setIdName(e.target.value)}
            required
            disabled={isSubmitting}
          />

          <div className="flex items-start gap-2 p-2.5 rounded-md bg-[var(--warning-soft)] border border-[var(--warning)]/35">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)] mt-0.5 shrink-0" />
            <p className="font-mono text-[11px] text-[var(--warning)] leading-relaxed">
              &gt; carry any one valid ID proof (physical or DigiLocker only) for the event. without
              proper ID verification, entry will be denied.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="sm:justify-between gap-3">
          <AlertDialogCancel
            onClick={handleClose}
            disabled={isSubmitting}
            className="m-0 bg-transparent border border-[var(--border-soft)] text-ink hover:bg-surface-2 hover:text-ink"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={!trimmedName || isSubmitting}
            variant="primary"
            className="m-0 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <BadgeCheck className="w-3.5 h-3.5" />
                {isUpdate ? "Update Participation" : "Confirm Participation"}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
