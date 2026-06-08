'use client'

import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { WorkspaceShell } from '@/components/WorkspaceShell'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  buttonVariants,
} from '@/components/ui'
import {
  formatCompactRupiah,
  formatRupiah,
  formatShortDate,
  isProjectOwner,
  paymentTypeLabel,
  projectTypeClass,
  projectTypeLabel,
  projectTypeValues,
} from '@/lib/project-utils'
import { shiftMonth, useWorkspaceData } from '@/lib/use-workspace-data'

function LoadingState({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#f6f7f8] p-6">
      <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-500">{label}</Card>
    </main>
  )
}

export default function CashflowPage() {
  const workspace = useWorkspaceData()

  if (workspace.loading) return <LoadingState label="Loading cashflow..." />
  if (workspace.loadError) return <LoadingState label={workspace.loadError} />

  const {
    chartData,
    currentUserEmail,
    currentUserId,
    currentUserName,
    monthlyPayments,
    monthlySummary,
    projectById,
    selectedMonth,
    setSelectedMonth,
  } = workspace

  const netData = chartData.map((item) => ({
    ...item,
    net: item.client - item.freelancer,
  }))
  const sortedPayments = [...monthlyPayments].sort((a, b) => {
    return new Date(b.date || '').getTime() - new Date(a.date || '').getTime()
  })

  return (
    <WorkspaceShell
      title="Cashflow"
      description="Pantau DP, pelunasan client, pembayaran freelancer, dan net owner"
      userName={currentUserName}
      userEmail={currentUserEmail}
      secondaryAction={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Prev
          </button>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
          />
          <button
            type="button"
            onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Next
          </button>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Dibayar Client</CardDescription>
            <CardTitle className="text-3xl">
              Rp {formatCompactRupiah(monthlySummary.clientPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Payment masuk untuk project milik owner.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Fee Freelancer</CardDescription>
            <CardTitle className="text-3xl">
              Rp {formatCompactRupiah(monthlySummary.freelancerPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Termasuk fee yang diterima saat jadi freelancer.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Net Owner</CardDescription>
            <CardTitle className="text-3xl">
              Rp {formatCompactRupiah(monthlySummary.ownerNet)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-600">Client paid dikurangi fee freelancer owner.</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cashflow Trend</CardTitle>
            <CardDescription>Client, freelancer, dan net harian pada bulan pilihan</CardDescription>
          </CardHeader>
          <CardContent className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netData} margin={{ left: 0, right: 16, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashClient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="cashFreelancer" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="cashNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  width={78}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `Rp ${formatCompactRupiah(Number(value))}`}
                />
                <Tooltip
                  formatter={(value) => `Rp ${formatRupiah(Number(value))}`}
                  labelFormatter={(label) => `Tanggal ${label}`}
                />
                <Area dataKey="client" name="Client" stroke="#0f766e" fill="url(#cashClient)" strokeWidth={2} />
                <Area dataKey="freelancer" name="Freelancer" stroke="#f97316" fill="url(#cashFreelancer)" strokeWidth={2} />
                <Area dataKey="net" name="Net" stroke="#4f46e5" fill="url(#cashNet)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insight Bulanan</CardTitle>
            <CardDescription>Ringkasan yang lebih cepat dibaca</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Rasio net owner</p>
              <p className="mt-1 text-2xl font-semibold">
                {monthlySummary.clientPaid
                  ? `${Math.round((monthlySummary.ownerNet / monthlySummary.clientPaid) * 100)}%`
                  : '0%'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Transaksi bulan ini</p>
              <p className="mt-1 text-2xl font-semibold">{monthlyPayments.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Catatan UX</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Project yang dikerjakan sendiri tetap masuk pendapatan owner karena payment client
                dihitung dari project yang dibuat owner, bukan dari fee freelancer.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Semua transaksi pada bulan pilihan</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedPayments.length === 0 ? (
            <EmptyState title="Belum ada transaksi" description="Input DP atau pembayaran dari detail project." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[140px_1fr_180px_160px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                <span>Tanggal</span>
                <span>Project</span>
                <span>Tipe</span>
                <span className="text-right">Nominal</span>
              </div>
              <div className="divide-y divide-slate-100">
                {sortedPayments.map((payment) => {
                  const project = projectById[payment.project_id || '']
                  const owner = isProjectOwner(project, currentUserId)
                  const typeValues = projectTypeValues(project)

                  return (
                    <Link
                      key={payment.id}
                      href={project ? `/project/${project.id}` : '/projects'}
                      className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[140px_1fr_180px_160px] lg:items-center"
                    >
                      <span className="text-sm text-slate-500">{formatShortDate(payment.date)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">
                          {project?.name || 'Project tidak tersedia'}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {payment.note || project?.client || '-'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 lg:hidden">
                          {typeValues.map((type) => (
                            <span
                              key={type}
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${projectTypeClass(type)}`}
                            >
                              {projectTypeLabel(type)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="hidden flex-wrap gap-1.5 lg:flex">
                        {typeValues.map((type) => (
                          <span
                            key={type}
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${projectTypeClass(type)}`}
                          >
                            {projectTypeLabel(type)}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3 lg:justify-end">
                        <Badge variant={payment.type === 'client' ? 'success' : owner ? 'warning' : 'info'}>
                          {paymentTypeLabel(payment.type)}
                        </Badge>
                        <span className="font-semibold">Rp {formatRupiah(Number(payment.amount || 0))}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </WorkspaceShell>
  )
}
