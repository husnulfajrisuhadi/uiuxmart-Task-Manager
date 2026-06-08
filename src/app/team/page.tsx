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
} from '@/components/ui'
import {
  assignmentExternalFeeTotal,
  formatRupiah,
  isAssignmentExternal,
  projectAssignmentLabel,
  projectTypeClass,
  projectTypeLabel,
  projectTypeOptions,
  userLabel,
} from '@/lib/project-utils'
import { useWorkspaceData } from '@/lib/use-workspace-data'

function LoadingState({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#f6f7f8] p-6">
      <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-500">{label}</Card>
    </main>
  )
}

export default function TeamPage() {
  const workspace = useWorkspaceData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const {
    assignmentsByProject,
    currentUserEmail,
    currentUserName,
    projectAssignments,
    projectById,
    projects,
    userById,
  } = workspace

  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return projectAssignments.filter((assignment) => {
      const project = projectById[assignment.project_id]
      const assignee = assignment.assigned_to ? userById[assignment.assigned_to] : null
      const matchesType = typeFilter === 'all' || assignment.project_type === typeFilter
      const matchesKeyword =
        !keyword ||
        project?.name.toLowerCase().includes(keyword) ||
        project?.client.toLowerCase().includes(keyword) ||
        projectAssignmentLabel(assignment).toLowerCase().includes(keyword) ||
        assignee?.name?.toLowerCase().includes(keyword) ||
        assignee?.email?.toLowerCase().includes(keyword)

      return matchesType && matchesKeyword
    })
  }, [projectAssignments, projectById, search, typeFilter, userById])

  const totals = useMemo(() => {
    const externalFees = projects.reduce((total, project) => {
      return total + assignmentExternalFeeTotal(assignmentsByProject[project.id] || [], project)
    }, 0)
    const uniqueFreelancers = new Set(
      projectAssignments
        .map((assignment) => assignment.assigned_to)
        .filter((value): value is string => Boolean(value))
    )

    return {
      roles: projectAssignments.length,
      deal: projectAssignments.reduce((total, assignment) => total + Number(assignment.deal_amount || 0), 0),
      fee: externalFees,
      freelancers: uniqueFreelancers.size,
    }
  }, [assignmentsByProject, projectAssignments, projects])

  if (workspace.loading) return <LoadingState label="Loading tim..." />
  if (workspace.loadError) return <LoadingState label={workspace.loadError} />

  return (
    <WorkspaceShell
      title="Tim & Fee"
      description="Pembagian role, porsi deal, dan fee freelancer per project"
      userName={currentUserName}
      userEmail={currentUserEmail}
      search={search}
      onSearchChange={setSearch}
    >
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Role</CardDescription>
            <CardTitle className="text-3xl">{totals.roles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Porsi Deal</CardDescription>
            <CardTitle className="text-3xl">Rp {formatRupiah(totals.deal)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Fee Eksternal</CardDescription>
            <CardTitle className="text-3xl">Rp {formatRupiah(totals.fee)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Contributor</CardDescription>
            <CardTitle className="text-3xl">{totals.freelancers}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader className="flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Role Assignment</CardTitle>
            <CardDescription>
              Assignee hanya melihat role miliknya sesuai RLS; owner melihat seluruh pembagian.
            </CardDescription>
          </div>
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="lg:w-56">
            <option value="all">Semua tipe</option>
            {projectTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState title="Belum ada role" description="Role dibuat dari modal Add Project atau detail project." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[1fr_1fr_150px_150px_150px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                <span>Project</span>
                <span>Role</span>
                <span>Assignee</span>
                <span className="text-right">Porsi Deal</span>
                <span className="text-right">Fee</span>
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map((assignment) => {
                  const project = projectById[assignment.project_id]
                  const assignee = assignment.assigned_to ? userById[assignment.assigned_to] : null
                  const external = isAssignmentExternal(assignment, project)

                  return (
                    <Link
                      key={assignment.id}
                      href={`/project/${assignment.project_id}`}
                      className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1fr_1fr_150px_150px_150px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{project?.name || 'Project'}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{project?.client || '-'}</p>
                      </div>
                      <div>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${projectTypeClass(assignment.project_type)}`}>
                          {projectTypeLabel(assignment.project_type)}
                        </span>
                        <p className="mt-2 text-sm font-medium text-slate-700">{projectAssignmentLabel(assignment)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {assignee ? userLabel(assignee) : 'Belum di-assign'}
                        </p>
                        <Badge variant={external ? 'info' : 'secondary'} className="mt-2">
                          {external ? 'Freelancer' : 'Owner/Self'}
                        </Badge>
                      </div>
                      <p className="font-semibold lg:text-right">
                        Rp {formatRupiah(Number(assignment.deal_amount || 0))}
                      </p>
                      <p className="font-semibold lg:text-right">
                        Rp {formatRupiah(external ? Number(assignment.internal_fee || 0) : 0)}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Model Kerja yang Disarankan</CardTitle>
          <CardDescription>Supaya owner dan freelancer tidak saling melihat detail yang tidak perlu</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="default">Solo</Badge>
            <p className="mt-3 font-semibold">Owner mengerjakan sendiri</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Fee otomatis 0, semua payment client masuk pendapatan owner.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="info">Delegasi</Badge>
            <p className="mt-3 font-semibold">Owner closing, freelancer kerja</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Fee freelancer dicatat sebagai cost, profit owner tetap terlihat.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="success">Kolaborasi</Badge>
            <p className="mt-3 font-semibold">Beberapa role dalam 1 project</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Setiap role punya porsi deal dan assignee sehingga tampilan freelancer lebih fokus.</p>
          </div>
        </CardContent>
      </Card>
    </WorkspaceShell>
  )
}
