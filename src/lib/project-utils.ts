export type PaymentType = 'client' | 'freelancer'
export type ProjectStatus = 'ongoing' | 'review' | 'revision' | 'done'
export type ProjectType = 'ui_ux_design' | 'thesis' | 'web_app'
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MilestoneStatus = 'planned' | 'in_progress' | 'review' | 'done'
export type ChangeRequestStatus = 'pending' | 'approved' | 'in_progress' | 'done'
export type StatusFilter = 'all' | ProjectStatus
export type ProjectTypeFilter = 'all' | ProjectType
export type PriorityFilter = 'all' | ProjectPriority
export type SortOption = 'newest' | 'oldest' | 'name' | 'value' | 'deadline' | 'priority'

export type Project = {
  id: string
  name: string
  client: string
  status: ProjectStatus | string
  project_type?: ProjectType | string | null
  priority?: ProjectPriority | string | null
  deadline_at?: string | null
  total_deal: number | string | null
  internal_cost: number | string | null
  assigned_to?: string | null
  created_by?: string | null
  created_at?: string | null
}

export type Payment = {
  id: string
  project_id: string | null
  type: PaymentType
  amount: number | string | null
  note?: string | null
  date: string | null
  created_at?: string | null
}

export type ProjectUpdate = {
  id: string
  note: string | null
  status: ProjectStatus | string
  milestone_id?: string | null
  created_at?: string | null
}

export type Milestone = {
  id: string
  project_id: string
  title: string
  description?: string | null
  status: MilestoneStatus | string
  deadline_at?: string | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type MilestoneTask = {
  id: string
  milestone_id: string
  title: string
  is_completed: boolean
  sort_order?: number | null
  completed_at?: string | null
  created_at?: string | null
}

export type ChangeRequest = {
  id: string
  project_id: string
  milestone_id?: string | null
  title: string
  description?: string | null
  status: ChangeRequestStatus | string
  additional_deal: number | string | null
  additional_cost: number | string | null
  deadline_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AppUser = {
  id: string
  name?: string | null
  email?: string | null
}

export const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'review', label: 'Review' },
  { value: 'revision', label: 'Revisi' },
  { value: 'done', label: 'Selesai' },
]

export const projectStatusOptions: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'review', label: 'Review' },
  { value: 'revision', label: 'Revisi' },
  { value: 'done', label: 'Selesai' },
]

export const projectTypeOptions: Array<{
  value: ProjectType
  label: string
  color: string
  chartColor: string
}> = [
  {
    value: 'ui_ux_design',
    label: 'Design UI/UX',
    color: 'bg-violet-50 text-violet-700 ring-violet-200',
    chartColor: '#7c3aed',
  },
  {
    value: 'thesis',
    label: 'Pengerjaan Skripsi',
    color: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    chartColor: '#0891b2',
  },
  {
    value: 'web_app',
    label: 'Website/Aplikasi',
    color: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    chartColor: '#c026d3',
  },
]

export const projectPriorityOptions: Array<{
  value: ProjectPriority
  label: string
}> = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Urgent' },
]

export const milestoneStatusOptions: Array<{ value: MilestoneStatus; label: string }> = [
  { value: 'planned', label: 'Direncanakan' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Selesai' },
]

export const changeRequestStatusOptions: Array<{
  value: ChangeRequestStatus
  label: string
}> = [
  { value: 'pending', label: 'Menunggu Persetujuan' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'done', label: 'Selesai' },
]

export function formatRupiah(num: number) {
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatCompactRupiah(num: number) {
  const abs = Math.abs(num)
  const formatCompact = (value: number) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)

  if (abs >= 1_000_000_000_000) return `${formatCompact(num / 1_000_000_000_000)} T`
  if (abs >= 1_000_000_000) return `${formatCompact(num / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `${formatCompact(num / 1_000_000)} jt`
  if (abs >= 1_000) return `${formatCompact(num / 1_000)} rb`

  return formatRupiah(num)
}

export function formatShortDate(date?: string | null) {
  if (!date) return '-'

  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(date?: string | null) {
  if (!date) return '-'

  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function toDateTimeLocal(date?: string | null) {
  if (!date) return ''

  const value = new Date(date)
  const localValue = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return localValue.toISOString().slice(0, 16)
}

export function statusLabel(status: string) {
  return projectStatusOptions.find((option) => option.value === status)?.label || status
}

export function statusClass(status: string) {
  if (status === 'done') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'review') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status === 'revision') return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-sky-50 text-sky-700 ring-sky-200'
}

export function milestoneStatusLabel(status: string) {
  return milestoneStatusOptions.find((option) => option.value === status)?.label || status
}

export function milestoneStatusClass(status: string) {
  if (status === 'done') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'review') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status === 'in_progress') return 'bg-sky-50 text-sky-700 ring-sky-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

export function projectTypeLabel(type?: string | null) {
  return projectTypeOptions.find((option) => option.value === type)?.label || 'Belum dikategorikan'
}

export function projectTypeClass(type?: string | null) {
  return (
    projectTypeOptions.find((option) => option.value === type)?.color ||
    'bg-slate-100 text-slate-600 ring-slate-200'
  )
}

export function projectPriorityLabel(priority?: string | null) {
  return (
    projectPriorityOptions.find((option) => option.value === priority)?.label || 'Normal'
  )
}

export function projectPriorityClass(priority?: string | null) {
  if (priority === 'urgent') return 'bg-red-50 text-red-700 ring-red-200'
  if (priority === 'high') return 'bg-orange-50 text-orange-700 ring-orange-200'
  if (priority === 'low') return 'bg-slate-100 text-slate-600 ring-slate-200'
  return 'bg-blue-50 text-blue-700 ring-blue-200'
}

export function projectPriorityRank(priority?: string | null) {
  if (priority === 'urgent') return 4
  if (priority === 'high') return 3
  if (priority === 'medium') return 2
  return 1
}

export function changeRequestStatusLabel(status: string) {
  return changeRequestStatusOptions.find((option) => option.value === status)?.label || status
}

export function changeRequestStatusClass(status: string) {
  if (status === 'done') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'in_progress') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (status === 'approved') return 'bg-violet-50 text-violet-700 ring-violet-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

export function isActiveChangeRequest(changeRequest: Pick<ChangeRequest, 'status'>) {
  return ['approved', 'in_progress', 'done'].includes(changeRequest.status)
}

export function projectFinancials(
  project:
    | Pick<Project, 'total_deal' | 'internal_cost' | 'created_by' | 'assigned_to'>
    | null
    | undefined,
  changeRequests: ChangeRequest[] = []
) {
  const baseDeal = Number(project?.total_deal || 0)
  const hasExternalAssignee = Boolean(
    project?.assigned_to && project.assigned_to !== project.created_by
  )
  const baseCost = hasExternalAssignee ? Number(project?.internal_cost || 0) : 0
  const activeChanges = changeRequests.filter(isActiveChangeRequest)
  const additionalDeal = activeChanges.reduce(
    (total, changeRequest) => total + Number(changeRequest.additional_deal || 0),
    0
  )
  const additionalCost = hasExternalAssignee
    ? activeChanges.reduce(
        (total, changeRequest) => total + Number(changeRequest.additional_cost || 0),
        0
      )
    : 0
  const totalDeal = baseDeal + additionalDeal
  const internalCost = baseCost + additionalCost

  return {
    baseDeal,
    baseCost,
    additionalDeal,
    additionalCost,
    totalDeal,
    internalCost,
    profit: totalDeal - internalCost,
    hasExternalAssignee,
  }
}

export function progressValue(completed: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.max(0, (completed / total) * 100))
}

export function taskProgress(tasks: MilestoneTask[]) {
  const completed = tasks.filter((task) => task.is_completed).length
  return {
    completed,
    total: tasks.length,
    percentage: tasks.length ? progressValue(completed, tasks.length) : 0,
  }
}

export function isProjectOwner(
  project: Pick<Project, 'created_by'> | null | undefined,
  userId: string
) {
  return Boolean(project?.created_by && project.created_by === userId)
}

export function isProjectAssignee(
  project: Pick<Project, 'assigned_to'> | null | undefined,
  userId: string
) {
  return Boolean(project?.assigned_to && project.assigned_to === userId)
}

export function userLabel(user: AppUser) {
  return user.name || user.email || user.id
}

export function paymentTypeLabel(type: PaymentType) {
  return type === 'client' ? 'Dari Client' : 'Ke Freelancer'
}

export function deadlineState(deadline?: string | null) {
  if (!deadline) return { label: 'Tanpa deadline', tone: 'neutral' as const }

  const difference = new Date(deadline).getTime() - Date.now()
  if (difference < 0) return { label: 'Terlambat', tone: 'danger' as const }

  const hours = Math.ceil(difference / 3_600_000)

  if (hours <= 24) return { label: `${Math.max(hours, 1)} jam lagi`, tone: 'warning' as const }

  const days = Math.ceil(hours / 24)
  if (days <= 7) return { label: `${days} hari lagi`, tone: 'warning' as const }

  return { label: formatDateTime(deadline), tone: 'neutral' as const }
}
