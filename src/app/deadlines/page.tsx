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
  Select,
  buttonVariants,
} from '@/components/ui'
import { cn } from '@/lib/cn'
import {
  deadlineState,
  formatDateTime,
  formatShortDate,
  milestoneStatusLabel,
  statusLabel,
} from '@/lib/project-utils'
import { calendarCells, localDateKey, shiftMonth, useWorkspaceData } from '@/lib/use-workspace-data'

type DeadlineFilter = 'all' | 'project' | 'milestone' | 'scope'

const typeLabel: Record<DeadlineFilter, string> = {
  all: 'Semua',
  project: 'Project',
  milestone: 'Milestone',
  scope: 'Tambahan Scope',
}

const typeClass: Record<Exclude<DeadlineFilter, 'all'>, string> = {
  project: 'bg-slate-950 text-white ring-slate-950',
  milestone: 'bg-sky-50 text-sky-700 ring-sky-200',
  scope: 'bg-violet-50 text-violet-700 ring-violet-200',
}

function LoadingState({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#f6f7f8] p-6">
      <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-500">{label}</Card>
    </main>
  )
}

export default function DeadlinesPage() {
  const workspace = useWorkspaceData()
  const [filter, setFilter] = useState<DeadlineFilter>('all')
  const [now] = useState(() => Date.now())
  const {
    currentUserEmail,
    currentUserName,
    deadlines,
    selectedMonth,
    setSelectedMonth,
  } = workspace

  const filteredDeadlines = deadlines.filter((item) => filter === 'all' || item.type === filter)
  const cells = calendarCells(selectedMonth)
  const deadlinesByDate = useMemo(() => {
    const map: Record<string, typeof filteredDeadlines> = {}
    filteredDeadlines.forEach((item) => {
      const key = localDateKey(new Date(item.deadline))
      map[key] ||= []
      map[key].push(item)
    })
    return map
  }, [filteredDeadlines])

  if (workspace.loading) return <LoadingState label="Loading deadlines..." />
  if (workspace.loadError) return <LoadingState label={workspace.loadError} />

  return (
    <WorkspaceShell
      title="Deadlines"
      description="Kalender deadline project, milestone, dan tambahan scope"
      userName={currentUserName}
      userEmail={currentUserEmail}
      secondaryAction={
        <div className="flex flex-wrap items-center gap-2">
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
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Deadline Aktif</CardDescription>
            <CardTitle className="text-3xl">{deadlines.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Semua item aktif dari project yang terlihat.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Terlambat</CardDescription>
            <CardTitle className="text-3xl">
              {deadlines.filter((item) => deadlineState(item.deadline).tone === 'danger').length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">Butuh follow up paling cepat.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>7 Hari Kedepan</CardDescription>
            <CardTitle className="text-3xl">
              {
                deadlines.filter((item) => {
                  const due = new Date(item.deadline).getTime()
                  return due >= now && due <= now + 7 * 24 * 60 * 60 * 1000
                }).length
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-600">Prioritas untuk dicek harian.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        <Card>
          <CardHeader className="flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                Warna berbeda membuat deadline project dan milestone tidak terlihat seperti project ganda.
              </CardDescription>
            </div>
            <Select value={filter} onChange={(event) => setFilter(event.target.value as DeadlineFilter)} className="lg:w-48">
              <option value="all">Semua deadline</option>
              <option value="project">Project</option>
              <option value="milestone">Milestone</option>
              <option value="scope">Tambahan scope</option>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                <div key={day} className="border-b border-slate-200 px-3 py-2 text-center">
                  {day}
                </div>
              ))}
              {cells.map((date, index) => {
                const key = date ? localDateKey(date) : `blank-${index}`
                const items = date ? deadlinesByDate[key] || [] : []
                const isToday = date ? localDateKey(new Date()) === key : false

                return (
                  <div
                    key={key}
                    className={cn(
                      'min-h-28 border-b border-r border-slate-100 p-2',
                      !date && 'bg-slate-50/70',
                      isToday && 'bg-emerald-50/60'
                    )}
                  >
                    {date && (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <span className={cn('text-sm font-semibold text-slate-700', isToday && 'text-emerald-700')}>
                            {date.getDate()}
                          </span>
                          {items.length > 0 && (
                            <span className="rounded-full bg-slate-950 px-1.5 py-0.5 text-[10px] text-white">
                              {items.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {items.slice(0, 3).map((item) => (
                            <Link
                              key={item.id}
                              href={`/project/${item.projectId}`}
                              className={`block truncate rounded-md px-2 py-1 text-[11px] font-semibold ring-1 ${typeClass[item.type]}`}
                              title={`${item.title} - ${typeLabel[item.type]}`}
                            >
                              {item.title}
                            </Link>
                          ))}
                          {items.length > 3 && (
                            <p className="text-[11px] font-medium text-slate-400">+{items.length - 3} lagi</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>Urutan dari yang paling dekat</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDeadlines.length === 0 ? (
              <EmptyState title="Tidak ada deadline" description="Coba ubah filter atau bulan." />
            ) : (
              <div className="space-y-3">
                {filteredDeadlines.slice(0, 12).map((item) => {
                  const state = deadlineState(item.deadline)
                  const status =
                    item.type === 'milestone'
                      ? milestoneStatusLabel(item.status || '')
                      : statusLabel(item.status || '')

                  return (
                    <Link
                      key={item.id}
                      href={`/project/${item.projectId}`}
                      className="block rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${typeClass[item.type]}`}>
                              {typeLabel[item.type]}
                            </span>
                            <Badge variant="outline">{status}</Badge>
                          </div>
                          <p className="mt-2 truncate font-semibold text-slate-950">{item.title}</p>
                          <p className="mt-1 truncate text-sm text-slate-500">{item.projectName}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(item.deadline)} ({formatShortDate(item.deadline)})
                          </p>
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
