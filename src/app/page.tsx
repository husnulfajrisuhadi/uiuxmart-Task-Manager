'use client'

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
  statusLabel,
} from '@/lib/project-utils'
import { useWorkspaceData } from '@/lib/use-workspace-data'

function LoadingCard({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#f6f7f8] p-6">
      <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-500">{label}</Card>
    </main>
  )
}

export default function DashboardPage() {
  const workspace = useWorkspaceData()

  if (workspace.loading) return <LoadingCard label="Loading dashboard..." />
  if (workspace.loadError) return <LoadingCard label={workspace.loadError} />

  const {
    chartData,
    currentUserEmail,
    currentUserName,
    deadlines,
    financialsByProject,
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
      description="Overview performa project uiuxmart"
      userName={currentUserName}
      userEmail={currentUserEmail}
      secondaryAction={
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
        />
      }
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Ringkasan Workspace
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Fokus dashboard hanya untuk overview. Detail kerja dipindah ke page khusus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}>
            Bulan Ini
          </Button>
          <Link href="/projects" className={buttonVariants()}>
            Tambah Project
          </Link>
        </div>
      </div>

      <Tabs className="mb-6">
        <TabButton active>Overview</TabButton>
        <Link
          href="/cashflow"
          className="rounded-md px-3 py-1.5 text-sm font-medium transition hover:text-slate-950"
        >
          Analytics
        </Link>
        <Link
          href="/deadlines"
          className="rounded-md px-3 py-1.5 text-sm font-medium transition hover:text-slate-950"
        >
          Reports
        </Link>
        <Link
          href="/scopes"
          className="rounded-md px-3 py-1.5 text-sm font-medium transition hover:text-slate-950"
        >
          Notifications
        </Link>
      </Tabs>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Project</CardDescription>
            <CardTitle className="text-3xl">{summary.totalProjects}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              {summary.activeProjects} aktif, {summary.doneProjects} selesai
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Pendapatan Diterima</CardDescription>
            <CardTitle className="text-3xl">
              Rp {formatCompactRupiah(summary.ownerClientPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-600">
              Net Rp {formatCompactRupiah(summary.ownerActualNet)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Estimasi Profit</CardDescription>
            <CardTitle className="text-3xl">
              Rp {formatCompactRupiah(summary.ownerProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">{ownedProjects.length} project owner</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Perlu Tindakan</CardDescription>
            <CardTitle className="text-3xl">{summary.pendingChanges + deadlines.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-600">
              {summary.pendingChanges} scope menunggu, {deadlines.length} deadline aktif
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.8fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Cashflow Bulanan</CardTitle>
              <CardDescription>Payment client dan freelancer pada bulan pilihan</CardDescription>
            </div>
            <Link href="/cashflow" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Detail
            </Link>
          </CardHeader>
          <CardContent className="h-[340px]">
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

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.9fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Project terakhir, bukan seluruh data dashboard</CardDescription>
            </div>
            <Link href="/projects" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Lihat Semua
            </Link>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <EmptyState title="Belum ada project" description="Tambahkan project pertama dari halaman Projects." />
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => {
                  const financials = financialsByProject[project.id]
                  const progress = taskProgressByProject[project.id]?.percentage || 0
                  const paid = paymentsByProject[project.id]?.client || paymentsByProject[project.id]?.freelancer || 0

                  return (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      className="block rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-950">{project.name}</p>
                            <Badge variant="outline">{statusLabel(project.status)}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{project.client}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {projectTypeValues(project).map((type) => (
                              <span
                                key={type}
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${projectTypeClass(type)}`}
                              >
                                {projectTypeLabel(type)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="w-full md:w-64">
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>Progress</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} />
                          <p className="mt-2 text-xs text-slate-500">
                            Terbayar Rp {formatRupiah(paid)} / Rp {formatRupiah(financials.totalDeal)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deadline Terdekat</CardTitle>
            <CardDescription>5 item aktif paling dekat</CardDescription>
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
                      className="block rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.title}</p>
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
    </WorkspaceShell>
  )
}
