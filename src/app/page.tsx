'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { WorkspaceShell } from '@/components/WorkspaceShell'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  MetricCard,
  Progress,
  TabButton,
  Tabs,
  buttonVariants,
} from '@/components/ui'
import {
  deadlineState,
  formatCompactRupiah,
  formatDateTime,
  formatRupiah,
  projectTypeClass,
  projectTypeLabel,
  projectTypeValues,
  statusClass,
  statusLabel,
} from '@/lib/project-utils'
import { useWorkspaceData } from '@/lib/use-workspace-data'

type DashboardTab = 'overview' | 'analytics'

function LoadingCard({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#e7eaee] p-6">
      <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-500">{label}</Card>
    </main>
  )
}

export default function DashboardPage() {
  const workspace = useWorkspaceData()
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

  if (workspace.loading) return <LoadingCard label="Loading dashboard..." />
  if (workspace.loadError) return <LoadingCard label={workspace.loadError} />

  const {
    chartData,
    currentUserEmail,
    currentUserName,
    deadlines,
    financialsByProject,
    monthlySummary,
    ownedProjects,
    paymentsByProject,
    projects,
    revenueByType,
    selectedMonth,
    setSelectedMonth,
    summary,
    taskProgressByProject,
  } = workspace

  const totalTypeRevenue = revenueByType.reduce((total, item) => total + item.value, 0)
  const recentProjects = projects.slice(0, 5)

  return (
    <WorkspaceShell
      title="Dashboard"
      description="Command center project, revenue, deadline, dan delivery uiuxmart"
      userName={currentUserName}
      userEmail={currentUserEmail}
      secondaryAction={
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm shadow-slate-950/5 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70"
        />
      }
    >
      <section className="mb-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
        <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.18),transparent_32rem)]" />
          <div className="relative">
            <Badge variant="outline" className="border-white/15 bg-white/10 text-white ring-white/15" dot>
              Workspace aktif
            </Badge>
            <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Kelola project dari deal sampai handover tanpa dashboard terasa penuh.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Overview hanya menampilkan keputusan penting. Detail operasional tetap masuk page khusus di sidebar.
            </p>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
            <p className="text-sm font-medium text-white/60">Net owner bulan pilihan</p>
            <p className="mt-2 text-3xl font-semibold">Rp {formatCompactRupiah(monthlySummary.ownerNet)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="soft"
                onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                className="bg-white/10 text-white ring-white/15 hover:bg-white/20 hover:text-white"
              >
                Bulan Ini
              </Button>
              <Link href="/projects" className={buttonVariants({ variant: 'outline', className: 'border-white/15 bg-white text-slate-950 hover:bg-white/90' })}>
                Tambah Project
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs>
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>
            Analytics
          </TabButton>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Link href="/cashflow" className={buttonVariants({ variant: 'outline' })}>
            Cashflow Detail
          </Link>
          <Link href="/deadlines" className={buttonVariants({ variant: 'outline' })}>
            Kalender Deadline
          </Link>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Project"
              value={summary.totalProjects}
              icon="□"
              helper={`${summary.activeProjects} aktif, ${summary.doneProjects} selesai`}
            />
            <MetricCard
              label="Pendapatan Diterima"
              value={`Rp ${formatCompactRupiah(summary.ownerClientPaid)}`}
              icon="↗"
              tone="emerald"
              helper={`Net aktual Rp ${formatCompactRupiah(summary.ownerActualNet)}`}
            />
            <MetricCard
              label="Estimasi Profit"
              value={`Rp ${formatCompactRupiah(summary.ownerProfit)}`}
              icon="∑"
              tone="violet"
              helper={`${ownedProjects.length} project milik owner`}
            />
            <MetricCard
              label="Perlu Tindakan"
              value={summary.pendingChanges + deadlines.length}
              icon="!"
              tone="amber"
              helper={`${summary.pendingChanges} scope menunggu, ${deadlines.length} deadline aktif`}
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
            <Card>
              <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Project terakhir yang butuh konteks cepat</CardDescription>
                </div>
                <Link href="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Lihat Semua
                </Link>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <EmptyState title="Belum ada project" description="Tambahkan project pertama dari halaman Projects." />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="hidden grid-cols-[1fr_180px_170px_180px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                      <span>Project</span>
                      <span>Tipe</span>
                      <span>Status</span>
                      <span className="text-right">Progress</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {recentProjects.map((project) => {
                        const financials = financialsByProject[project.id]
                        const progress = taskProgressByProject[project.id]?.percentage || 0
                        const paid = paymentsByProject[project.id]?.client || paymentsByProject[project.id]?.freelancer || 0

                        return (
                          <Link
                            key={project.id}
                            href={`/project/${project.id}`}
                            className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1fr_180px_170px_180px] lg:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-950">{project.name}</p>
                              <p className="mt-1 truncate text-sm text-slate-500">{project.client}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {projectTypeValues(project).map((type) => (
                                <span
                                  key={type}
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${projectTypeClass(type)}`}
                                >
                                  {projectTypeLabel(type)}
                                </span>
                              ))}
                            </div>
                            <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(project.status)}`}>
                              {statusLabel(project.status)}
                            </span>
                            <div>
                              <div className="mb-1 flex justify-between text-xs text-slate-500">
                                <span>Rp {formatCompactRupiah(paid)}</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} />
                              <p className="mt-1 text-right text-xs text-slate-400">
                                Deal Rp {formatCompactRupiah(financials.totalDeal)}
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Deadline Terdekat</CardTitle>
                  <CardDescription>5 item aktif paling dekat</CardDescription>
                </div>
                <Link href="/deadlines" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Kalender
                </Link>
              </CardHeader>
              <CardContent>
                {deadlines.length === 0 ? (
                  <EmptyState title="Tidak ada deadline aktif" />
                ) : (
                  <div className="space-y-3">
                    {deadlines.slice(0, 5).map((item) => {
                      const state = deadlineState(item.deadline)
                      return (
                        <Link
                          key={item.id}
                          href={`/project/${item.projectId}`}
                          className="block rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={
                                    item.type === 'project'
                                      ? 'default'
                                      : item.type === 'milestone'
                                        ? 'info'
                                        : 'violet'
                                  }
                                  dot
                                >
                                  {item.type === 'project' ? 'Project' : item.type === 'milestone' ? 'Milestone' : 'Scope'}
                                </Badge>
                              </div>
                              <p className="mt-2 truncate text-sm font-semibold">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{item.projectName}</p>
                              <p className="mt-1 text-xs text-slate-400">{formatDateTime(item.deadline)}</p>
                            </div>
                            <Badge
                              variant={
                                state.tone === 'danger'
                                  ? 'danger'
                                  : state.tone === 'warning'
                                    ? 'warning'
                                    : 'secondary'
                              }
                              dot
                            >
                              {state.label}
                            </Badge>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {activeTab === 'analytics' && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Client Paid"
              value={`Rp ${formatCompactRupiah(monthlySummary.clientPaid)}`}
              icon="↙"
              tone="emerald"
              helper="Payment masuk pada bulan pilihan"
            />
            <MetricCard
              label="Freelancer Paid"
              value={`Rp ${formatCompactRupiah(monthlySummary.freelancerPaid)}`}
              icon="↗"
              tone="amber"
              helper="Fee keluar dan fee diterima sebagai freelancer"
            />
            <MetricCard
              label="Net Owner"
              value={`Rp ${formatCompactRupiah(monthlySummary.ownerNet)}`}
              icon="∑"
              tone="sky"
              helper="Client paid dikurangi fee freelancer owner"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)]">
            <Card>
              <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Cashflow Bulanan</CardTitle>
                  <CardDescription>Payment client dan freelancer pada bulan pilihan</CardDescription>
                </div>
                <Link href="/cashflow" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Detail
                </Link>
              </CardHeader>
              <CardContent className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 16, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="client" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0f766e" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="freelancer" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.03} />
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
                    <Area
                      type="monotone"
                      dataKey="client"
                      name="Client"
                      stroke="#0f766e"
                      fill="url(#client)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="freelancer"
                      name="Freelancer"
                      stroke="#f97316"
                      fill="url(#freelancer)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pendapatan per Tipe</CardTitle>
                <CardDescription>Distribusi payment client bulan ini</CardDescription>
              </CardHeader>
              <CardContent>
                {totalTypeRevenue === 0 ? (
                  <EmptyState title="Belum ada revenue" description="Payment client bulan ini belum tercatat." />
                ) : (
                  <>
                    <div className="relative h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueByType.filter((item) => item.value > 0)}
                            dataKey="value"
                            innerRadius={62}
                            outerRadius={90}
                            paddingAngle={3}
                            strokeWidth={0}
                          >
                            {revenueByType
                              .filter((item) => item.value > 0)
                              .map((item) => (
                                <Cell key={item.name} fill={item.color} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(value) => `Rp ${formatRupiah(Number(value))}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                        <div>
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="text-lg font-semibold">
                            Rp {formatCompactRupiah(totalTypeRevenue)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {revenueByType.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 text-slate-600">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-semibold">Rp {formatCompactRupiah(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </WorkspaceShell>
  )
}
