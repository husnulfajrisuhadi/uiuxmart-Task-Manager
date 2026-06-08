'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import {
  formatDateTime,
  formatRupiah,
  formatShortDate,
  projectTypeLabels,
  statusLabel,
} from '@/lib/project-utils'

type PublicInvoiceProject = {
  id: string
  name: string
  client: string
  status: string
  project_type?: string | null
  project_types?: string[] | null
  deadline_at?: string | null
  base_deal: number | string
  total_deal: number | string
}

type PublicInvoiceScope = {
  title: string
  description?: string | null
  amount: number | string
}

type PublicInvoiceData = {
  invoice_number: string
  issued_at: string
  project: PublicInvoiceProject
  scopes: PublicInvoiceScope[]
  client_paid: number | string
}

export default function PublicInvoicePage() {
  const params = useParams()
  const token = Array.isArray(params.token) ? params.token[0] : (params.token as string)

  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchInvoice() {
      setLoading(true)
      setError('')

      const { data, error: invoiceError } = await supabase.rpc('get_public_invoice', {
        invoice_token: token,
      })

      setLoading(false)

      if (invoiceError) {
        console.error(invoiceError)
        setError('Invoice tidak bisa dimuat.')
        return
      }

      if (!data) {
        setError('Invoice tidak ditemukan atau link sudah dinonaktifkan.')
        return
      }

      setInvoice(data as PublicInvoiceData)
    }

    if (token) void fetchInvoice()
  }, [token])

  const lineItems = useMemo(() => {
    if (!invoice) return []

    return [
      {
        title: invoice.project.name,
        description: `Project awal: ${projectTypeLabels(invoice.project).join(', ')}`,
        amount: Number(invoice.project.base_deal || 0),
      },
      ...invoice.scopes.map((scope) => ({
        title: scope.title,
        description: scope.description || 'Tambahan scope yang sudah disetujui',
        amount: Number(scope.amount || 0),
      })),
    ]
  }, [invoice])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#dfe3e6] p-4 sm:p-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading invoice...
        </div>
      </main>
    )
  }

  if (error || !invoice) {
    return (
      <main className="min-h-screen bg-[#dfe3e6] p-4 sm:p-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-lg font-semibold text-slate-950">Invoice tidak tersedia</p>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </main>
    )
  }

  const totalDeal = Number(invoice.project.total_deal || 0)
  const clientPaid = Number(invoice.client_paid || 0)
  const remaining = Math.max(0, totalDeal - clientPaid)

  return (
    <main className="min-h-screen bg-[#dfe3e6] p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="no-print mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Cetak / Simpan PDF
          </button>
        </div>

        <div className="print-invoice overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-6 bg-slate-950 px-6 py-7 text-white sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                uiuxmart
              </p>
              <h1 className="mt-3 text-3xl font-semibold">Invoice</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                Digital product, UI/UX, website, aplikasi, dan project service.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-slate-300">Nomor Invoice</p>
              <p className="mt-1 font-semibold">{invoice.invoice_number}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-slate-300">Tanggal</p>
              <p className="mt-1 font-semibold">{formatShortDate(invoice.issued_at)}</p>
            </div>
          </div>

          <div className="grid gap-4 border-b border-slate-200 px-6 py-5 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ditagihkan Kepada
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {invoice.project.client}
              </p>
              <p className="mt-1 text-sm text-slate-500">{invoice.project.name}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Layanan
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {projectTypeLabels(invoice.project).join(', ')}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Status {statusLabel(invoice.project.status)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Deadline
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {formatDateTime(invoice.project.deadline_at)}
              </p>
              <p className="mt-1 text-sm text-slate-500">Atas nama uiuxmart</p>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[1fr_150px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Deskripsi</span>
                <span className="text-right">Nominal</span>
              </div>
              <div className="divide-y divide-slate-100">
                {lineItems.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="grid grid-cols-[1fr_150px] gap-4 px-4 py-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                    </div>
                    <p className="text-right font-semibold text-slate-950">
                      Rp {formatRupiah(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">Catatan Pembayaran</p>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  Invoice ini diterbitkan oleh uiuxmart. Nominal terbayar dihitung dari payment
                  client yang sudah tercatat di sistem.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total invoice</span>
                  <span className="font-semibold text-slate-950">
                    Rp {formatRupiah(totalDeal)}
                  </span>
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-slate-500">Sudah dibayar</span>
                  <span className="font-semibold text-emerald-700">
                    Rp {formatRupiah(clientPaid)}
                  </span>
                </div>
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-700">Sisa tagihan</span>
                    <span className="text-xl font-semibold text-slate-950">
                      Rp {formatRupiah(remaining)}
                    </span>
                  </div>
                </div>
                <div
                  className={`mt-4 rounded-full px-3 py-1 text-center text-xs font-semibold ${
                    remaining <= 0
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {remaining <= 0 ? 'Lunas' : 'Belum lunas'}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between gap-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-sm font-semibold text-slate-950">uiuxmart</p>
                <p className="mt-1 text-xs text-slate-500">
                  Invoice dibuat otomatis dari sistem.
                </p>
              </div>
              <div className="text-right">
                <div className="ml-auto h-px w-36 bg-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-500">Authorized</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
