"use client"

import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "確認",
  cancelText = "キャンセル",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && open) {
          if (loading) return
          onCancel()
        }
      }}
    >
      <DialogContent className="max-w-sm px-7 pb-7 pt-6">
        <DialogHeader className="text-base font-semibold text-foreground">{title}</DialogHeader>
        {description && (
          <p className="px-1 pb-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
            {description}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 px-1 pb-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="sm:w-auto"
            disabled={loading}
            onClick={() => {
              if (loading) return
              onCancel()
            }}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="sm:w-auto"
            disabled={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
