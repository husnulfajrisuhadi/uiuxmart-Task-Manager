import type { ReactNode } from 'react'

type ModalProps = {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  maxWidth?: string
}

export function Modal({ title, description, children, onClose, maxWidth = 'max-w-lg' }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:items-center">
      <div
        className={`flex max-h-[calc(100vh-2rem)] w-full ${maxWidth} flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
            aria-label="Tutup modal"
          >
            X
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  busy?: boolean
  variant?: 'danger' | 'neutral'
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Batal',
  busy = false,
  variant = 'neutral',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null

  const handleCancel = () => {
    if (!busy) onCancel()
  }

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-slate-950 text-white hover:bg-slate-800'

  return (
    <Modal title={title} description={description} onClose={handleCancel} maxWidth="max-w-md">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`rounded px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
        >
          {busy ? 'Memproses...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
