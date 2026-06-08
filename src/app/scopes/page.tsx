'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { WorkspaceShell } from '@/components/WorkspaceShell'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Select,
  buttonVariants,
} from '@/components/ui'
import {
  changeRequestStatusClass,
  changeRequestStatusLabel,
  formatDateTime,
  formatRupiah,
  projectTypeClass,
  projectTypeLabel,
  projectTypeValues,
} from '@/lib/project-utils'
import { useWorkspaceData } from '@/lib/use-workspace-data'

type ScopeFilter = 'all' | 'pending' | 'approved' | 'in_progress' | 'done'

function LoadingState({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#f6f7f8] p-6">
      <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-500">{label}</Card>
    </main>
  )
}

export default function ScopesPage() {
  const workspace = useWorkspaceData()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ScopeFilter>('all')

  const {
    changeRequests,
    currentUserEmail,
    currentUserName,
    financialsByProject,
    projectById,
  } = workspace

  const filteredScopes = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return changeRequests.filter((scope) => {
      const project = projectById[scope.project_id]
      const matchesKeyword =
        !keyword ||
        scope.title.toLowerCase().includes(keyword) ||
        scope.description?.toLowerCase().includes(keyword) ||
        project?.name.toLowerCase().includes(keyword) ||
        project?.client.toLowerCase().includes(keyword)
      const matchesStatus = filter === 'all' || scope.status === filter
      return matchesKeyword && matchesStatus
    })
  }, [changeRequests, filter, projectById, search])

  const scopeSummary = useMemo(() => {
    return {
      total: changeRequests.length,
      pending: changeRequests.filter((scope) => scope.status === 'pending').length,
      active: changeRequests.filter((scope) => ['approved', 'in_progress'].includes(scope.status)).length,
      value: changeRequests
        .filter((scope) => ['approved', 'in_progress', 'done'].includes(scope.status))
        .reduce((total, scope) => total + Number(scope.additional_deal || 0), 0),
    }
  }, [changeRequests])

  if (workspace.loading) return <LoadingState label="Loading tambahan scope..." />
  if (workspace.loadError) return <LoadingState label={workspace.loadError} />

  return (
    <WorkspaceShell
      title="Tambahan Scope"
      description="Catat tambahan fitur, revisi berbayar, dan perubahan deal client"
      userName={currentUserName}
      userEmail={currentUserEmail}
      search={search}
      onSearchChange={setSearch}
      action={
        <Link href="/projects" className={buttonVariants()}>
          Pilih Project
        </Link>
      }
    >
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Scope</CardDescription>
            <CardTitle className="text-3xl">{scopeSummary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Menunggu</CardDescription>
            <CardTitle className="text-3xl">{scopeSummary.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Aktif</CardDescription>
            <CardTitle className="text-3xl">{scopeSummary.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Nilai Tambahan</CardDescription>
            <CardTitle className="text-3xl">Rp {formatRupiah(scopeSummary.value)}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader className="flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Daftar Tambahan Scope</CardTitle>
            <CardDescription>
              Nama teknis database tetap change_requests, tetapi copy UI dibuat lebih manusiawi.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_190px] lg:w-[520px]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari scope atau project" />
            <Select value={filter} onChange={(event) => setFilter(event.target.value as ScopeFilter)}>
              <option value="all">Semua status</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="in_progress">Dikerjakan</option>
              <option value="done">Selesai</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredScopes.length === 0 ? (
            <EmptyState title="Belum ada tambahan scope" description="Tambahkan dari detail project saat ada fitur atau revisi berbayar." />
          ) : (
            <div className="space-y-3">
              {filteredScopes.map((scope) => {
                const project = projectById[scope.project_id]
                const financials = financialsByProject[scope.project_id]
                const typeValues = projectTypeValues(project)

                return (
                  <Link
                    key={scope.id}
                    href={`/project/${scope.project_id}`}
                    className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${changeRequestStatusClass(scope.status)}`}>
                            {changeRequestStatusLabel(scope.status)}
                          </span>
                          {typeValues.map((type) => (
                            <span
                              key={type}
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${projectTypeClass(type)}`}
                            >
                              {projectTypeLabel(type)}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-base font-semibold text-slate-950">{scope.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{project?.name || 'Project tidak tersedia'}</p>
                        {scope.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{scope.description}</p>
                        )}
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Tambahan deal</span>
                          <span className="font-semibold">Rp {formatRupiah(Number(scope.additional_deal || 0))}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3">
                          <span className="text-slate-500">Tambahan fee</span>
                          <span className="font-semibold">Rp {formatRupiah(Number(scope.additional_cost || 0))}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3">
                          <span className="text-slate-500">Total project</span>
                          <span className="font-semibold">Rp {formatRupiah(financials?.totalDeal || 0)}</span>
                        </div>
                        <div className="mt-2 flex justify-between gap-3">
                          <span className="text-slate-500">Deadline</span>
                          <span className="font-semibold">{formatDateTime(scope.deadline_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Rekomendasi UX</CardTitle>
          <CardDescription>Flow terbaik untuk tambahan kerja setelah deal awal</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="warning">1</Badge>
            <p className="mt-3 font-semibold">Menunggu approval</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Catat permintaan client dulu tanpa langsung menaikkan deal.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="info">2</Badge>
            <p className="mt-3 font-semibold">Disetujui</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Baru masuk ke nilai project dan invoice ketika nominal sudah disepakati.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="success">3</Badge>
            <p className="mt-3 font-semibold">Selesai</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Scope selesai tetap tersimpan sebagai histori agar project tidak perlu dipecah.</p>
          </div>
        </CardContent>
      </Card>
    </WorkspaceShell>
  )
}
