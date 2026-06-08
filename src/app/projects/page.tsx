'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { Modal } from '@/components/Modal'
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
  Input,
  Progress,
  Select,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import {
  type ProjectType,
  formatRupiah,
  isProjectOwner,
  projectTypeClass,
  projectTypeLabel,
  projectTypeOptions,
  projectTypeValues,
  statusLabel,
  userLabel,
} from '@/lib/project-utils'
import { useWorkspaceData } from '@/lib/use-workspace-data'

type AssignmentRow = {
  projectType: ProjectType
  roleLabel: string
  assignedTo: string
  dealAmount: string
  internalFee: string
}

function defaultAssignmentRow(projectType: ProjectType, userId: string): AssignmentRow {
  return {
    projectType,
    roleLabel: projectTypeLabel(projectType),
    assignedTo: userId,
    dealAmount: '',
    internalFee: '',
  }
}

export default function ProjectsPage() {
  const workspace = useWorkspaceData()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ProjectType>('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>(['web_app'])
  const [deadline, setDeadline] = useState('')
  const [deal, setDeal] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [downPaymentDate, setDownPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([])

  const {
    currentUserEmail,
    currentUserId,
    currentUserName,
    fetchAll,
    financialsByProject,
    loading,
    loadError,
    paymentsByProject,
    projects,
    taskProgressByProject,
    users,
  } = workspace

  const filteredProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return projects.filter((project) => {
      const matchesKeyword =
        !keyword ||
        project.name.toLowerCase().includes(keyword) ||
        project.client.toLowerCase().includes(keyword)
      const matchesType = typeFilter === 'all' || projectTypeValues(project).includes(typeFilter)
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter
      return matchesKeyword && matchesType && matchesStatus
    })
  }, [projects, search, statusFilter, typeFilter])

  function resetForm() {
    setName('')
    setClient('')
    setProjectTypes(['web_app'])
    setDeadline('')
    setDeal('')
    setDownPayment('')
    setDownPaymentDate(new Date().toISOString().split('T')[0])
    setAssignmentRows([defaultAssignmentRow('web_app', currentUserId)])
    setFormError('')
  }

  function openModal() {
    resetForm()
    setModalOpen(true)
  }

  function toggleProjectType(value: ProjectType) {
    setProjectTypes((current) => {
      if (current.includes(value)) {
        if (current.length === 1) return current
        setAssignmentRows((rows) => rows.filter((row) => row.projectType !== value))
        return current.filter((item) => item !== value)
      }

      setAssignmentRows((rows) => [...rows, defaultAssignmentRow(value, currentUserId)])
      return [...current, value]
    })
  }

  function updateAssignmentRow(index: number, patch: Partial<AssignmentRow>) {
    setAssignmentRows((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        const next = { ...row, ...patch }
        if (patch.projectType) next.roleLabel = projectTypeLabel(patch.projectType)
        if (patch.assignedTo !== undefined && (!patch.assignedTo || patch.assignedTo === currentUserId)) {
          next.internalFee = ''
        }
        return next
      })
    )
  }

  async function saveProject() {
    setFormError('')

    const dealValue = Number(deal)
    const downPaymentValue = Number(downPayment || 0)
    const normalizedAssignments = assignmentRows
      .filter((row) => projectTypes.includes(row.projectType))
      .map((row, index) => {
        const assignedUser = row.assignedTo || currentUserId
        const isExternal = assignedUser && assignedUser !== currentUserId
        return {
          project_type: row.projectType,
          role_label: row.roleLabel.trim() || projectTypeLabel(row.projectType),
          assigned_to: assignedUser || null,
          deal_amount: Number(row.dealAmount || 0),
          internal_fee: isExternal ? Number(row.internalFee || 0) : 0,
          sort_order: index,
        }
      })
    const internalCost = normalizedAssignments.reduce((total, row) => total + row.internal_fee, 0)

    if (!name.trim() || !client.trim() || !deal || projectTypes.length === 0) {
      setFormError('Nama, client, tipe project, dan deal wajib diisi.')
      return
    }

    if (Number.isNaN(dealValue) || dealValue <= 0 || downPaymentValue < 0) {
      setFormError('Nilai deal dan DP harus valid.')
      return
    }

    if (downPaymentValue > dealValue) {
      setFormError('DP tidak boleh lebih besar dari deal client.')
      return
    }

    if (
      normalizedAssignments.some(
        (row) =>
          Number.isNaN(row.deal_amount) ||
          Number.isNaN(row.internal_fee) ||
          row.internal_fee > row.deal_amount
      )
    ) {
      setFormError('Porsi deal dan fee tiap role harus valid.')
      return
    }

    if (deadline && Number.isNaN(new Date(deadline).getTime())) {
      setFormError('Deadline tidak valid.')
      return
    }

    setSaving(true)

    const primaryAssignee =
      normalizedAssignments.find((row) => row.assigned_to && row.assigned_to !== currentUserId)
        ?.assigned_to ||
      normalizedAssignments.find((row) => row.assigned_to)?.assigned_to ||
      null

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        client: client.trim(),
        project_type: projectTypes[0],
        project_types: projectTypes,
        deadline_at: deadline ? new Date(deadline).toISOString() : null,
        total_deal: dealValue,
        internal_cost: internalCost,
        assigned_to: primaryAssignee,
        created_by: currentUserId,
        status: 'ongoing',
      })
      .select('id')

    if (error || !data?.[0]?.id) {
      setSaving(false)
      console.error(error)
      setFormError('Gagal tambah project.')
      return
    }

    const projectId = data[0].id
    const { error: assignmentError } = await supabase.from('project_assignments').insert(
      normalizedAssignments.map((row) => ({
        ...row,
        project_id: projectId,
      }))
    )

    if (assignmentError) {
      setSaving(false)
      console.error(assignmentError)
      setFormError('Project tersimpan, tetapi pembagian kerja gagal dibuat.')
      await fetchAll()
      return
    }

    if (downPaymentValue > 0) {
      const { error: paymentError } = await supabase.from('payments').insert({
        project_id: projectId,
        type: 'client',
        amount: downPaymentValue,
        note: 'Down payment awal',
        date: downPaymentDate,
      })
      if (paymentError) console.error(paymentError)
    }

    setSaving(false)
    setModalOpen(false)
    await fetchAll()
  }

  if (loading) return <Card className="m-6 p-6 text-sm text-slate-500">Loading projects...</Card>
  if (loadError) return <Card className="m-6 p-6 text-sm text-red-600">{loadError}</Card>

  return (
    <WorkspaceShell
      title="Projects"
      description="Kelola project, tipe layanan, deadline, role, dan fee"
      userName={currentUserName}
      userEmail={currentUserEmail}
      search={search}
      onSearchChange={setSearch}
      action={
        <Button
          onClick={openModal}
          className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full p-0 text-xl shadow-2xl sm:static sm:h-10 sm:w-auto sm:rounded-md sm:px-4 sm:text-sm sm:shadow"
          aria-label="Tambah project"
        >
          <span className="sm:hidden">+</span>
          <span className="hidden sm:inline">Add Project +</span>
        </Button>
      }
    >
      <Card>
        <CardHeader className="flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Project List</CardTitle>
            <CardDescription>{filteredProjects.length} project sesuai filter</CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | ProjectType)}>
              <option value="all">Semua tipe</option>
              {projectTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Semua status</option>
              <option value="ongoing">Ongoing</option>
              <option value="review">Review</option>
              <option value="revision">Revisi</option>
              <option value="done">Selesai</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <EmptyState title="Tidak ada project" description="Coba ubah filter atau tambah project baru." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[1.4fr_1fr_160px_180px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                <span>Project</span>
                <span>Tipe</span>
                <span>Status</span>
                <span className="text-right">Progress</span>
              </div>
              <div className="divide-y divide-slate-100">
                {filteredProjects.map((project) => {
                  const financials = financialsByProject[project.id]
                  const progress = taskProgressByProject[project.id]?.percentage || 0
                  const payments = paymentsByProject[project.id]
                  const paid = isProjectOwner(project, currentUserId)
                    ? payments?.client || 0
                    : payments?.freelancer || 0

                  return (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      className="grid grid-cols-1 gap-3 px-4 py-4 transition hover:bg-slate-50 lg:grid-cols-[1.4fr_1fr_160px_180px] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{project.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{project.client}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {projectTypeValues(project).map((type) => (
                          <span key={type} className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${projectTypeClass(type)}`}>
                            {projectTypeLabel(type)}
                          </span>
                        ))}
                      </div>
                      <Badge variant="outline">{statusLabel(project.status)}</Badge>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-slate-500">
                          <span>Rp {formatRupiah(paid)}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} />
                        <p className="mt-1 text-right text-xs text-slate-400">
                          Deal Rp {formatRupiah(financials.totalDeal)}
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

      {modalOpen && (
        <Modal
          title="Add Project"
          description="Buat project baru dengan tipe, role, fee, deadline, dan DP awal."
          onClose={() => setModalOpen(false)}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Nama project</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Client</span>
                <Input value={client} onChange={(event) => setClient(event.target.value)} />
              </label>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-slate-700">Tipe project</span>
              <div className="grid gap-3 md:grid-cols-3">
                {projectTypeOptions.map((option) => {
                  const selected = projectTypes.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleProjectType(option.value)}
                      className={`flex min-h-24 flex-col justify-between rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-slate-950 bg-slate-950 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className={selected ? 'text-xs text-slate-300' : 'text-xs text-slate-500'}>
                        Klik untuk {selected ? 'hapus' : 'pilih'} tipe
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Deal client</span>
                <Input type="number" value={deal} onChange={(event) => setDeal(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Deadline</span>
                <Input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">DP awal</span>
                <Input type="number" value={downPayment} onChange={(event) => setDownPayment(event.target.value)} />
              </label>
            </div>

            <Card className="bg-slate-50">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Pembagian Kerja</CardTitle>
                  <CardDescription>Role owner fee 0, role eksternal pakai fee freelancer.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignmentRows((rows) => [...rows, defaultAssignmentRow(projectTypes[0], currentUserId)])}
                >
                  + Role
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignmentRows.map((row, index) => {
                  const isExternal = row.assignedTo && row.assignedTo !== currentUserId
                  return (
                    <div key={`${row.projectType}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[1fr_1fr_150px_150px]">
                      <Select value={row.projectType} onChange={(event) => updateAssignmentRow(index, { projectType: event.target.value as ProjectType })}>
                        {projectTypes.map((type) => (
                          <option key={type} value={type}>{projectTypeLabel(type)}</option>
                        ))}
                      </Select>
                      <Select value={row.assignedTo} onChange={(event) => updateAssignmentRow(index, { assignedTo: event.target.value })}>
                        <option value="">Belum di-assign</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.id === currentUserId ? `${userLabel(user)} (Saya)` : userLabel(user)}
                          </option>
                        ))}
                      </Select>
                      <Input type="number" placeholder="Porsi deal" value={row.dealAmount} onChange={(event) => updateAssignmentRow(index, { dealAmount: event.target.value })} />
                      <Input
                        type="number"
                        placeholder={isExternal ? 'Fee' : 'Fee 0'}
                        disabled={!isExternal}
                        value={isExternal ? row.internalFee : ''}
                        onChange={(event) => updateAssignmentRow(index, { internalFee: event.target.value })}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {downPayment && (
              <label className="block max-w-xs">
                <span className="mb-1 block text-sm font-medium text-slate-700">Tanggal DP</span>
                <Input type="date" value={downPaymentDate} onChange={(event) => setDownPaymentDate(event.target.value)} />
              </label>
            )}

            {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
              <Button type="button" onClick={saveProject} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Project'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </WorkspaceShell>
  )
}
