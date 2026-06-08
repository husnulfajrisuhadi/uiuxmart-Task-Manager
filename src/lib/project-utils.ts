export type PaymentType = 'client' | 'freelancer'
export type ProjectStatus = 'ongoing' | 'review' | 'revision' | 'done'
export type ProjectType = 'ui_ux_design' | 'thesis' | 'web_app'
export type MilestoneStatus = 'planned' | 'in_progress' | 'review' | 'revision' | 'done'
export type ChangeRequestStatus = 'pending' | 'approved' | 'in_progress' | 'done'
export type StatusFilter = 'all' | ProjectStatus
export type ProjectTypeFilter = 'all' | ProjectType
export type SortOption = 'newest' | 'oldest' | 'name' | 'value' | 'deadline'

export type ProjectAssignment = {
  id: string
  project_id: string
  project_type: ProjectType | string
  assigned_to?: string | null
  role_label?: string | null
  deal_amount: number | string | null
  internal_fee: number | string | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type Project = {
  id: string
  name: string
  client: string
  status: ProjectStatus | string
  project_type?: ProjectType | string | null
  project_types?: ProjectType[] | string[] | null
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
  assignment_id?: string | null
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
  assignment_id?: string | null
  milestone_id?: string | null
  created_at?: string | null
}

export type Milestone = {
  id: string
  project_id: string
  assignment_id?: string | null
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
  assignment_id?: string | null
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

export type HandoverItem = {
  id: string
  project_id: string
  title: string
  is_completed: boolean
  sort_order?: number | null
  completed_at?: string | null
  created_at?: string | null
}

export type MilestoneTemplate = {
  title: string
  description: string
  tasks: string[]
}

export type MilestoneTemplateGroup = {
  project_type: ProjectType
  label: string
  description: string
  milestones: MilestoneTemplate[]
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

export const milestoneStatusOptions: Array<{ value: MilestoneStatus; label: string }> = [
  { value: 'planned', label: 'Belum Mulai' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'review', label: 'Review Client' },
  { value: 'revision', label: 'Revisi' },
  { value: 'done', label: 'Selesai' },
]

export const changeRequestStatusOptions: Array<{
  value: ChangeRequestStatus
  label: string
}> = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'done', label: 'Selesai' },
]

export const milestoneTemplateGroups: MilestoneTemplateGroup[] = [
  {
    project_type: 'ui_ux_design',
    label: 'Template Design UI/UX',
    description: 'Rekomendasi fase design dari discovery sampai handoff.',
    milestones: [
      {
        title: 'Discovery & Requirement',
        description: 'Memahami kebutuhan client, user, referensi, dan batasan produk.',
        tasks: ['Brief client', 'Kumpulkan referensi', 'Susun user flow', 'Konfirmasi scope design'],
      },
      {
        title: 'Wireframe',
        description: 'Membuat struktur halaman sebelum masuk visual detail.',
        tasks: ['Wireframe halaman utama', 'Wireframe halaman pendukung', 'Review alur dengan client'],
      },
      {
        title: 'High Fidelity Design',
        description: 'Membuat tampilan final sesuai brand dan kebutuhan produk.',
        tasks: ['Design komponen utama', 'Design semua screen', 'Rapikan responsive state'],
      },
      {
        title: 'Prototype & Handoff',
        description: 'Menyiapkan prototype dan asset agar siap diteruskan ke development.',
        tasks: ['Buat prototype', 'Review final client', 'Siapkan asset handoff', 'Dokumentasi design'],
      },
    ],
  },
  {
    project_type: 'thesis',
    label: 'Template Skripsi Bab 1-6',
    description: 'Rekomendasi milestone naskah skripsi dari pendahuluan sampai finalisasi.',
    milestones: [
      {
        title: 'Bab 1 - Pendahuluan',
        description: 'Fondasi masalah, tujuan, manfaat, dan batasan penelitian.',
        tasks: [
          'Latar belakang',
          'Rumusan masalah',
          'Tujuan penelitian',
          'Manfaat penelitian',
          'Batasan masalah',
        ],
      },
      {
        title: 'Bab 2 - Landasan Teori',
        description: 'Teori pendukung, penelitian terdahulu, dan kerangka berpikir.',
        tasks: ['Teori utama', 'Penelitian terdahulu', 'Kerangka berpikir', 'Daftar pustaka awal'],
      },
      {
        title: 'Bab 3 - Metodologi',
        description: 'Metode, data, kebutuhan sistem, dan rancangan penelitian.',
        tasks: ['Metode penelitian', 'Objek/data penelitian', 'Teknik pengumpulan data', 'Rancangan pengujian'],
      },
      {
        title: 'Bab 4 - Analisis & Perancangan',
        description: 'Analisis kebutuhan dan rancangan program/dokumen teknis.',
        tasks: ['Analisis kebutuhan', 'Flow/UML', 'Rancangan database', 'Rancangan interface'],
      },
      {
        title: 'Bab 5 - Implementasi & Pengujian',
        description: 'Implementasi hasil kerja dan pengujian sistem/penelitian.',
        tasks: ['Implementasi fitur', 'Screenshot hasil', 'Pengujian sistem', 'Pembahasan hasil'],
      },
      {
        title: 'Bab 6 - Kesimpulan & Saran',
        description: 'Penutup, kesimpulan, saran, dan finalisasi naskah.',
        tasks: ['Kesimpulan', 'Saran', 'Rapikan format kampus', 'Cek daftar pustaka dan lampiran'],
      },
    ],
  },
  {
    project_type: 'web_app',
    label: 'Template Website/Aplikasi',
    description: 'Rekomendasi fase produksi dari requirement sampai deploy.',
    milestones: [
      {
        title: 'Requirement & Arsitektur',
        description: 'Memastikan scope fitur, data, role user, dan keputusan teknis awal.',
        tasks: ['Finalisasi fitur', 'Rancang database', 'Rancang flow user', 'Setup repo/project'],
      },
      {
        title: 'UI & Frontend',
        description: 'Membangun tampilan, komponen, dan interaksi utama.',
        tasks: ['Layout utama', 'Komponen reusable', 'Responsive mobile', 'Integrasi state/form'],
      },
      {
        title: 'Backend & Integrasi',
        description: 'Membangun data flow, auth, API, dan integrasi service.',
        tasks: ['Auth dan role', 'CRUD utama', 'Validasi data', 'Integrasi storage/API'],
      },
      {
        title: 'Testing & Deploy',
        description: 'Menutup bug, melakukan final review, dan deploy.',
        tasks: ['Testing fitur utama', 'Fix bug prioritas', 'Deploy production', 'Dokumentasi akses'],
      },
    ],
  },
]

export const handoverTemplateItems = [
  'File final/source design atau dokumen kerja sudah diberikan',
  'Repo/source code dan akses deployment sudah disiapkan',
  'Credential, akun, dan environment penting sudah dicatat aman',
  'Dokumentasi penggunaan singkat sudah dibuat',
  'Backup final project sudah disimpan',
  'Masa garansi/maintenance dan batas revisi sudah dikonfirmasi',
]

export function formatRupiah(num: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(num))
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
  if (status === 'revision') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (status === 'in_progress') return 'bg-sky-50 text-sky-700 ring-sky-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

export function projectTypeLabel(type?: string | null) {
  return projectTypeOptions.find((option) => option.value === type)?.label || 'Belum dikategorikan'
}

export function projectTypeValues(project?: Pick<Project, 'project_type' | 'project_types'> | null) {
  const values = Array.isArray(project?.project_types)
    ? project.project_types
    : project?.project_type
      ? [project.project_type]
      : []

  return values.filter((value): value is ProjectType =>
    projectTypeOptions.some((option) => option.value === value)
  )
}

export function projectTypeLabels(project?: Pick<Project, 'project_type' | 'project_types'> | null) {
  const values = projectTypeValues(project)
  if (values.length === 0) return ['Belum dikategorikan']
  return values.map((value) => projectTypeLabel(value))
}

export function projectTypeClass(type?: string | null) {
  return (
    projectTypeOptions.find((option) => option.value === type)?.color ||
    'bg-slate-100 text-slate-600 ring-slate-200'
  )
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
  changeRequests: ChangeRequest[] = [],
  assignments: ProjectAssignment[] = []
) {
  const baseDeal = Number(project?.total_deal || 0)
  const externalAssignments = assignments.filter(
    (assignment) =>
      assignment.assigned_to &&
      (!project?.created_by || assignment.assigned_to !== project.created_by)
  )
  const hasAssignmentSplit = assignments.length > 0
  const hasExternalAssignee = hasAssignmentSplit
    ? externalAssignments.length > 0
    : Boolean(project?.assigned_to && project.assigned_to !== project.created_by)
  const baseCost = hasAssignmentSplit
    ? externalAssignments.reduce(
        (total, assignment) => total + Number(assignment.internal_fee || 0),
        0
      )
    : hasExternalAssignee
      ? Number(project?.internal_cost || 0)
      : 0
  const activeChanges = changeRequests.filter(isActiveChangeRequest)
  const additionalDeal = activeChanges.reduce(
    (total, changeRequest) => total + Number(changeRequest.additional_deal || 0),
    0
  )
  const additionalCost = activeChanges.reduce((total, changeRequest) => {
    if (!hasExternalAssignee) return total

    if (hasAssignmentSplit && changeRequest.assignment_id) {
      const assignment = assignments.find((item) => item.id === changeRequest.assignment_id)
      if (!assignment?.assigned_to || assignment.assigned_to === project?.created_by) return total
    }

    return total + Number(changeRequest.additional_cost || 0)
  }, 0)
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

export function projectAssignmentsForProject(assignments: ProjectAssignment[], projectId?: string) {
  if (!projectId) return []
  return assignments
    .filter((assignment) => assignment.project_id === projectId)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
}

export function projectAssignmentLabel(assignment?: ProjectAssignment | null) {
  if (!assignment) return 'Scope project'
  return assignment.role_label?.trim() || projectTypeLabel(assignment.project_type)
}

export function isAssignmentExternal(
  assignment: ProjectAssignment | null | undefined,
  project: Pick<Project, 'created_by'> | null | undefined
) {
  return Boolean(
    assignment?.assigned_to && (!project?.created_by || assignment.assigned_to !== project.created_by)
  )
}

export function assignmentDealTotal(assignments: ProjectAssignment[]) {
  return assignments.reduce((total, assignment) => total + Number(assignment.deal_amount || 0), 0)
}

export function assignmentExternalFeeTotal(
  assignments: ProjectAssignment[],
  project: Pick<Project, 'created_by'> | null | undefined
) {
  return assignments.reduce(
    (total, assignment) =>
      total + (isAssignmentExternal(assignment, project) ? Number(assignment.internal_fee || 0) : 0),
    0
  )
}

export function userProjectAssignments(assignments: ProjectAssignment[], userId: string) {
  return assignments.filter((assignment) => assignment.assigned_to === userId)
}

export function isProjectContributor(
  project: Pick<Project, 'assigned_to' | 'created_by'> | null | undefined,
  assignments: ProjectAssignment[],
  userId: string
) {
  return (
    isProjectOwner(project, userId) ||
    isProjectAssignee(project, userId) ||
    assignments.some((assignment) => assignment.assigned_to === userId)
  )
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
