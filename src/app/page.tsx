'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ConfirmDialog, Modal } from '@/components/Modal'
import { supabase } from '@/lib/supabase'
import {
  type AppUser,
  type ChangeRequest,
  type Milestone,
  type MilestoneTask,
  type Payment,
  type Project,
  type ProjectAssignment,
  type ProjectType,
  type ProjectTypeFilter,
  type SortOption,
  type StatusFilter,
  assignmentDealTotal,
  assignmentExternalFeeTotal,
  deadlineState,
  formatCompactRupiah,
  formatDateTime,
  formatRupiah,
  formatShortDate,
  isProjectAssignee,
  isProjectOwner,
  progressValue,
  projectFinancials,
  projectAssignmentLabel,
  projectAssignmentsForProject,
  projectTypeClass,
  projectTypeLabel,
  projectTypeOptions,
  projectTypeValues,
  statusClass,
  statusLabel,
  statusOptions,
  toDateTimeLocal,
  userLabel,
} from '@/lib/project-utils'

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

type ProjectModalMode = 'create' | 'edit' | null
type ConfirmAction = { type: 'delete'; project: Project } | { type: 'logout' } | null
type Notice = { type: 'error' | 'success'; message: string } | null

type ChartPoint = {
  day: string
  client: number
  freelancer: number
}

type RevenuePoint = {
  name: string
  value: number
  color: string
}

type AssignmentFormRow = {
  id?: string
  projectType: ProjectType
  roleLabel: string
  assignedTo: string
  dealAmount: string
  internalFee: string
}

type DashboardNotification = {
  id: string
  projectId: string
  title: string
  detail: string
  deadline?: string | null
  tone: 'danger' | 'warning' | 'info'
}

type CalendarDeadlineType = 'project' | 'milestone' | 'scope'

type CalendarDeadlineGroup = {
  projectId: string
  title: string
  types: CalendarDeadlineType[]
}

function paymentTotal(payments: Payment[], type: Payment['type']) {
  return payments
    .filter((payment) => payment.type === type)
    .reduce((acc, payment) => acc + Number(payment.amount || 0), 0)
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}

function calendarCells(value: string) {
  const [year, month] = value.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const mondayOffset = (firstDay.getDay() + 6) % 7

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month - 1, index + 1)),
  ]
}

function shouldNotifyDeadline(deadline?: string | null) {
  if (!deadline) return false
  return new Date(deadline).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
}

function defaultAssignmentRow(projectType: ProjectType, userId: string): AssignmentFormRow {
  return {
    projectType,
    roleLabel: projectTypeLabel(projectType),
    assignedTo: userId,
    dealAmount: '',
    internalFee: '',
  }
}

export default function Home() {
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [milestoneTasks, setMilestoneTasks] = useState<MilestoneTask[]>([])
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<Notice>(null)

  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>(['web_app'])
  const [deadline, setDeadline] = useState('')
  const [deal, setDeal] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [downPaymentDate, setDownPaymentDate] = useState(() => new Date().toISOString().split('T')[0])
  const [assignedTo, setAssignedTo] = useState('')
  const [assignmentRows, setAssignmentRows] = useState<AssignmentFormRow[]>([])
  const [formError, setFormError] = useState('')
  const [savingProject, setSavingProject] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [openActionProjectId, setOpenActionProjectId] = useState('')

  const [projectModalMode, setProjectModalMode] = useState<ProjectModalMode>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7))
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<ProjectTypeFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function init() {
    setPageLoading(true)
    setLoadError('')
    setNotice(null)

    try {
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const user = data.session?.user

      if (!user) {
        router.replace('/login')
        return
      }

      setCurrentUserId(user.id)
      setCurrentUserEmail(user.email || '')

      await fetchAll(user.id)
    } catch (error) {
      console.error(error)
      setLoadError('Dashboard gagal dimuat. Jalankan migrasi Supabase terbaru lalu coba lagi.')
    } finally {
      setPageLoading(false)
    }
  }

  async function fetchAll(userId: string) {
    const [usersResult, projectsResult] = await Promise.all([
      supabase.from('users').select('id,name,email').order('name'),
      supabase
        .from('projects')
        .select('*')
        .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
        .order('created_at', { ascending: false }),
    ])

    if (projectsResult.error) throw projectsResult.error

    if (usersResult.error) {
      console.error(usersResult.error)
      setUsers([])
    } else {
      const userRows = (usersResult.data as AppUser[] | null) || []
      setUsers(userRows)
      const currentUser = userRows.find((user) => user.id === userId)
      setCurrentUserName(currentUser?.name || '')
    }

    const projectRows = (projectsResult.data as Project[] | null) || []
    const projectIds = projectRows.map((project) => project.id)
    let paymentRows: Payment[] = []
    let milestoneRows: Milestone[] = []
    let taskRows: MilestoneTask[] = []
    let changeRequestRows: ChangeRequest[] = []
    let assignmentRowsData: ProjectAssignment[] = []

    if (projectIds.length > 0) {
      const [paymentsResult, milestonesResult, changeRequestsResult, assignmentsResult] =
        await Promise.all([
        supabase
          .from('payments')
          .select('*')
          .in('project_id', projectIds)
          .order('date', { ascending: true }),
        supabase
          .from('milestones')
          .select('*')
          .in('project_id', projectIds)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('change_requests')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('project_assignments')
          .select('*')
          .in('project_id', projectIds)
          .order('sort_order', { ascending: true }),
      ])

      if (paymentsResult.error) throw paymentsResult.error
      if (milestonesResult.error) throw milestonesResult.error
      if (changeRequestsResult.error) throw changeRequestsResult.error
      if (assignmentsResult.error) throw assignmentsResult.error

      assignmentRowsData = (assignmentsResult.data as ProjectAssignment[] | null) || []

      const rawPayments = (paymentsResult.data as Payment[] | null) || []
      paymentRows = rawPayments.filter((payment) => {
        const project = projectRows.find((item) => item.id === payment.project_id)
        const projectRoleIds = assignmentRowsData
          .filter(
            (assignment) =>
              assignment.project_id === payment.project_id && assignment.assigned_to === userId
          )
          .map((assignment) => assignment.id)

        return (
          isProjectOwner(project, userId) ||
          (payment.type === 'freelancer' &&
            (!payment.assignment_id ||
              projectRoleIds.length === 0 ||
              projectRoleIds.includes(payment.assignment_id)))
        )
      })

      milestoneRows = (milestonesResult.data as Milestone[] | null) || []
      changeRequestRows = (changeRequestsResult.data as ChangeRequest[] | null) || []
      const milestoneIds = milestoneRows.map((milestone) => milestone.id)

      if (milestoneIds.length > 0) {
        const { data: tasksData, error: tasksError } = await supabase
          .from('milestone_tasks')
          .select('*')
          .in('milestone_id', milestoneIds)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        if (tasksError) throw tasksError
        taskRows = (tasksData as MilestoneTask[] | null) || []
      }
    }

    setProjects(projectRows)
    setPayments(paymentRows)
    setMilestones(milestoneRows)
    setMilestoneTasks(taskRows)
    setChangeRequests(changeRequestRows)
    setProjectAssignments(assignmentRowsData)
  }

  function resetProjectForm() {
    setName('')
    setClient('')
    setProjectTypes(['web_app'])
    setDeadline('')
    setDeal('')
    setDownPayment('')
    setDownPaymentDate(new Date().toISOString().split('T')[0])
    setAssignedTo('')
    setAssignmentRows([])
    setFormError('')
    setEditingProject(null)
  }

  function openCreateProjectModal() {
    setOpenActionProjectId('')
    resetProjectForm()
    setAssignedTo(currentUserId)
    setAssignmentRows([defaultAssignmentRow('web_app', currentUserId)])
    setProjectModalMode('create')
  }

  function openEditProjectModal(project: Project) {
    if (!isProjectOwner(project, currentUserId)) {
      setNotice({ type: 'error', message: 'Hanya pembuat project yang bisa mengubah data ini.' })
      return
    }

    setOpenActionProjectId('')
    setEditingProject(project)
    setName(project.name)
    setClient(project.client)
    setProjectTypes(projectTypeValues(project).length ? projectTypeValues(project) : ['web_app'])
    setDeadline(toDateTimeLocal(project.deadline_at))
    setDeal(String(project.total_deal || ''))
    setDownPayment('')
    setDownPaymentDate(new Date().toISOString().split('T')[0])
    setAssignedTo(project.assigned_to || '')
    const existingAssignments = projectAssignmentsForProject(projectAssignments, project.id)
    setAssignmentRows(
      existingAssignments.length
        ? existingAssignments.map((assignment) => ({
            id: assignment.id,
            projectType: assignment.project_type as ProjectType,
            roleLabel: assignment.role_label || projectAssignmentLabel(assignment),
            assignedTo: assignment.assigned_to || '',
            dealAmount: String(assignment.deal_amount || ''),
            internalFee: String(assignment.internal_fee || ''),
          }))
        : [
            {
              projectType: projectTypeValues(project)[0] || 'web_app',
              roleLabel: projectTypeLabel(projectTypeValues(project)[0] || 'web_app'),
              assignedTo: project.assigned_to || currentUserId,
              dealAmount: String(project.total_deal || ''),
              internalFee:
                project.assigned_to && project.assigned_to !== project.created_by
                  ? String(project.internal_cost || '')
                  : '',
            },
          ]
    )
    setFormError('')
    setProjectModalMode('edit')
  }

  function closeProjectModal() {
    setProjectModalMode(null)
    resetProjectForm()
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

  function addAssignmentRow(projectType = projectTypes[0] || 'web_app') {
    setAssignmentRows((rows) => [...rows, defaultAssignmentRow(projectType, currentUserId)])
  }

  function updateAssignmentRow(index: number, patch: Partial<AssignmentFormRow>) {
    setAssignmentRows((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row

        const nextRow = { ...row, ...patch }
        if (
          patch.assignedTo !== undefined &&
          (!patch.assignedTo || patch.assignedTo === currentUserId)
        ) {
          nextRow.internalFee = ''
        }
        if (patch.projectType) {
          nextRow.roleLabel = projectTypeLabel(patch.projectType)
        }

        return nextRow
      })
    )
  }

  function removeAssignmentRow(index: number) {
    setAssignmentRows((rows) => {
      if (rows.length === 1) return rows
      return rows.filter((_, rowIndex) => rowIndex !== index)
    })
  }

  async function saveProject() {
    setFormError('')
    setNotice(null)

    const trimmedName = name.trim()
    const trimmedClient = client.trim()
    const dealValue = Number(deal)
    const normalizedAssignments = assignmentRows
      .filter((row) => projectTypes.includes(row.projectType))
      .map((row, index) => {
        const assignedUser = row.assignedTo || currentUserId
        const isExternal = Boolean(assignedUser && assignedUser !== currentUserId)
        const dealAmount = Number(row.dealAmount || 0)
        const internalFee = isExternal ? Number(row.internalFee || 0) : 0

        return {
          id: row.id,
          project_type: row.projectType,
          role_label: row.roleLabel.trim() || projectTypeLabel(row.projectType),
          assigned_to: assignedUser || null,
          deal_amount: dealAmount,
          internal_fee: internalFee,
          sort_order: index,
        }
      })
    const hasExternalAssignee = normalizedAssignments.some(
      (assignment) => assignment.assigned_to && assignment.assigned_to !== currentUserId
    )
    const costValue = normalizedAssignments.reduce(
      (total, assignment) => total + Number(assignment.internal_fee || 0),
      0
    )
    const downPaymentValue =
      projectModalMode === 'create' ? Number(downPayment || 0) : 0

    if (!trimmedName || !trimmedClient || !deal || projectTypes.length === 0) {
      setFormError('Nama, client, tipe project, dan deal wajib diisi.')
      return
    }

    if (normalizedAssignments.length === 0) {
      setFormError('Minimal satu pembagian kerja wajib dibuat.')
      return
    }

    const invalidAssignment = normalizedAssignments.find(
      (assignment) =>
        Number.isNaN(assignment.deal_amount) ||
        Number.isNaN(assignment.internal_fee) ||
        assignment.deal_amount < 0 ||
        assignment.internal_fee < 0 ||
        assignment.internal_fee > assignment.deal_amount
    )

    if (invalidAssignment) {
      setFormError('Porsi deal dan fee tiap role harus valid, dan fee tidak boleh melebihi porsinya.')
      return
    }

    const allocatedDeal = normalizedAssignments.reduce(
      (total, assignment) => total + Number(assignment.deal_amount || 0),
      0
    )

    if (allocatedDeal > dealValue) {
      setFormError('Total porsi deal role tidak boleh melebihi deal client.')
      return
    }

    if (
      hasExternalAssignee &&
      normalizedAssignments.some(
        (assignment) =>
          assignment.assigned_to &&
          assignment.assigned_to !== currentUserId &&
          assignment.internal_fee <= 0
      )
    ) {
      setFormError('Fee freelancer wajib diisi untuk role yang dikerjakan orang lain.')
      return
    }

    if (Number.isNaN(dealValue) || Number.isNaN(costValue) || dealValue <= 0 || costValue < 0) {
      setFormError('Nilai project harus berupa angka yang valid.')
      return
    }

    if (Number.isNaN(downPaymentValue) || downPaymentValue < 0) {
      setFormError('Down payment harus berupa angka yang valid.')
      return
    }

    if (downPaymentValue > dealValue) {
      setFormError('Down payment tidak boleh lebih besar dari deal client.')
      return
    }

    if (downPaymentValue > 0 && !downPaymentDate) {
      setFormError('Tanggal down payment wajib diisi.')
      return
    }

    if (costValue > dealValue) {
      setFormError('Fee freelancer tidak boleh lebih besar dari deal client.')
      return
    }

    if (deadline && Number.isNaN(new Date(deadline).getTime())) {
      setFormError('Deadline tidak valid.')
      return
    }

    if (projectModalMode === 'edit' && !isProjectOwner(editingProject, currentUserId)) {
      setFormError('Project ini hanya bisa diedit oleh pembuatnya.')
      return
    }

    setSavingProject(true)

    const payload = {
      name: trimmedName,
      client: trimmedClient,
      project_type: projectTypes[0],
      project_types: projectTypes,
      deadline_at: deadline ? new Date(deadline).toISOString() : null,
      total_deal: dealValue,
      internal_cost: costValue,
      assigned_to:
        normalizedAssignments.find(
          (assignment) => assignment.assigned_to && assignment.assigned_to !== currentUserId
        )?.assigned_to ||
        normalizedAssignments.find((assignment) => assignment.assigned_to)?.assigned_to ||
        assignedTo ||
        null,
    }

    const result =
      projectModalMode === 'edit' && editingProject
        ? await supabase
            .from('projects')
            .update(payload)
            .eq('id', editingProject.id)
            .eq('created_by', currentUserId)
            .select('id')
        : await supabase
            .from('projects')
            .insert({
              ...payload,
              created_by: currentUserId,
              status: 'ongoing',
            })
            .select('id')

    setSavingProject(false)

    if (result.error) {
      console.error(result.error)
      setFormError(projectModalMode === 'edit' ? 'Gagal update project.' : 'Gagal tambah project.')
      return
    }

    if (projectModalMode === 'edit' && !result.data?.length) {
      setFormError('Project tidak berubah karena akses sudah tidak valid.')
      return
    }

    const savedProjectId = result.data?.[0]?.id

    if (savedProjectId) {
      const assignmentPayload = normalizedAssignments.map((assignment) => ({
        project_id: savedProjectId,
        project_type: assignment.project_type,
        role_label: assignment.role_label,
        assigned_to: assignment.assigned_to,
        deal_amount: assignment.deal_amount,
        internal_fee: assignment.internal_fee,
        sort_order: assignment.sort_order,
      }))

      if (projectModalMode === 'edit') {
        const existingRows = projectAssignmentsForProject(projectAssignments, savedProjectId)
        const keepIds = normalizedAssignments
          .map((assignment) => assignment.id)
          .filter((assignmentId): assignmentId is string => Boolean(assignmentId))
        const deleteIds = existingRows
          .map((assignment) => assignment.id)
          .filter((assignmentId) => !keepIds.includes(assignmentId))

        if (deleteIds.length > 0) {
          const { error: deleteAssignmentError } = await supabase
            .from('project_assignments')
            .delete()
            .in('id', deleteIds)

          if (deleteAssignmentError) {
            console.error(deleteAssignmentError)
            setFormError('Project tersimpan, tetapi role lama gagal dibersihkan.')
            setSavingProject(false)
            return
          }
        }

        for (const assignment of normalizedAssignments) {
          const payloadRow = {
            project_id: savedProjectId,
            project_type: assignment.project_type,
            role_label: assignment.role_label,
            assigned_to: assignment.assigned_to,
            deal_amount: assignment.deal_amount,
            internal_fee: assignment.internal_fee,
            sort_order: assignment.sort_order,
          }

          const assignmentResult = assignment.id
            ? await supabase.from('project_assignments').update(payloadRow).eq('id', assignment.id)
            : await supabase.from('project_assignments').insert(payloadRow)

          if (assignmentResult.error) {
            console.error(assignmentResult.error)
            setFormError('Project tersimpan, tetapi pembagian kerja gagal diupdate.')
            setSavingProject(false)
            return
          }
        }
      } else if (assignmentPayload.length > 0) {
        const { error: assignmentError } = await supabase
          .from('project_assignments')
          .insert(assignmentPayload)

        if (assignmentError) {
          console.error(assignmentError)
          closeProjectModal()
          setNotice({
            type: 'error',
            message:
              'Project tersimpan, tetapi pembagian kerja gagal dibuat. Jalankan migrasi Supabase terbaru lalu edit Tim & Fee.',
          })
          setSavingProject(false)
          if (currentUserId) await fetchAll(currentUserId)
          return
        }
      }
    }

    if (projectModalMode === 'create' && downPaymentValue > 0 && savedProjectId) {
      const { error: paymentError } = await supabase.from('payments').insert({
        project_id: savedProjectId,
        type: 'client',
        amount: downPaymentValue,
        note: 'Down payment awal',
        date: downPaymentDate,
      })

      if (paymentError) {
        console.error(paymentError)
        closeProjectModal()
        setNotice({
          type: 'error',
          message: 'Project tersimpan, tetapi down payment gagal dicatat. Tambahkan payment manual.',
        })
        if (currentUserId) await fetchAll(currentUserId)
        return
      }
    }

    const successMessage =
      projectModalMode === 'edit' ? 'Project berhasil diupdate.' : 'Project baru tersimpan.'
    closeProjectModal()
    setNotice({ type: 'success', message: successMessage })

    if (currentUserId) await fetchAll(currentUserId)
  }

  function requestDeleteProject(project: Project) {
    if (!isProjectOwner(project, currentUserId)) {
      setNotice({ type: 'error', message: 'Hanya pembuat project yang bisa menghapus data ini.' })
      return
    }

    setOpenActionProjectId('')
    setConfirmAction({ type: 'delete', project })
  }

  async function confirmDeleteProject() {
    const project = confirmAction?.type === 'delete' ? confirmAction.project : null
    if (!project) return

    setDeletingProjectId(project.id)

    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)
      .eq('created_by', currentUserId)
      .select('id')

    setDeletingProjectId('')

    if (error) {
      console.error(error)
      setNotice({ type: 'error', message: 'Gagal hapus project.' })
      return
    }

    if (!data?.length) {
      setNotice({ type: 'error', message: 'Project tidak terhapus karena akses sudah tidak valid.' })
      setConfirmAction(null)
      return
    }

    setConfirmAction(null)
    setNotice({ type: 'success', message: 'Project berhasil dihapus.' })
    if (currentUserId) await fetchAll(currentUserId)
  }

  async function confirmLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    setLoggingOut(false)
    setConfirmAction(null)
    router.push('/login')
  }

  const projectById = useMemo(() => {
    const map: Record<string, Project> = {}
    projects.forEach((project) => {
      map[project.id] = project
    })
    return map
  }, [projects])

  const changeRequestsByProject = useMemo(() => {
    const map: Record<string, ChangeRequest[]> = {}

    projects.forEach((project) => {
      map[project.id] = []
    })
    changeRequests.forEach((changeRequest) => {
      map[changeRequest.project_id] ||= []
      map[changeRequest.project_id].push(changeRequest)
    })

    return map
  }, [changeRequests, projects])

  const assignmentsByProject = useMemo(() => {
    const map: Record<string, ProjectAssignment[]> = {}

    projects.forEach((project) => {
      map[project.id] = []
    })
    projectAssignments.forEach((assignment) => {
      map[assignment.project_id] ||= []
      map[assignment.project_id].push(assignment)
    })

    return map
  }, [projectAssignments, projects])

  const financialsByProject = useMemo(() => {
    const map: Record<string, ReturnType<typeof projectFinancials>> = {}

    projects.forEach((project) => {
      map[project.id] = projectFinancials(
        project,
        changeRequestsByProject[project.id],
        assignmentsByProject[project.id]
      )
    })

    return map
  }, [assignmentsByProject, changeRequestsByProject, projects])

  const userById = useMemo(() => {
    const map: Record<string, AppUser> = {}
    users.forEach((user) => {
      map[user.id] = user
    })
    return map
  }, [users])

  const ownedProjects = useMemo(
    () => projects.filter((project) => isProjectOwner(project, currentUserId)),
    [currentUserId, projects]
  )

  const assignedProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          !isProjectOwner(project, currentUserId) &&
          (isProjectAssignee(project, currentUserId) ||
            (assignmentsByProject[project.id] || []).some(
              (assignment) => assignment.assigned_to === currentUserId
            ))
      ),
    [assignmentsByProject, currentUserId, projects]
  )

  const summary = useMemo(() => {
    const ownerDeal = ownedProjects.reduce(
      (acc, project) => acc + financialsByProject[project.id].totalDeal,
      0
    )
    const ownerCost = ownedProjects.reduce(
      (acc, project) => acc + financialsByProject[project.id].internalCost,
      0
    )
    const assignedValue = assignedProjects.reduce(
      (acc, project) => acc + financialsByProject[project.id].internalCost,
      0
    )
    const ownerPayments = payments.filter((payment) =>
      isProjectOwner(projectById[payment.project_id || ''], currentUserId)
    )
    const ownerClientPaid = paymentTotal(ownerPayments, 'client')
    const ownerFreelancerPaid = paymentTotal(ownerPayments, 'freelancer')

    return {
      ownerDeal,
      ownerProfit: ownerDeal - ownerCost,
      ownerClientPaid,
      ownerActualNet: ownerClientPaid - ownerFreelancerPaid,
      assignedValue,
      totalProjects: projects.length,
      ownedProjects: ownedProjects.length,
      assignedProjects: assignedProjects.length,
      activeProjects: projects.filter((project) => project.status !== 'done').length,
      doneProjects: projects.filter((project) => project.status === 'done').length,
      pendingChanges: changeRequests.filter(
        (changeRequest) =>
          changeRequest.status === 'pending' &&
          isProjectOwner(projectById[changeRequest.project_id], currentUserId)
      ).length,
    }
  }, [
    assignedProjects,
    changeRequests,
    currentUserId,
    financialsByProject,
    ownedProjects,
    payments,
    projectById,
    projects,
  ])

  const monthlyPayments = useMemo(
    () => payments.filter((payment) => payment.date?.slice(0, 7) === selectedMonth),
    [payments, selectedMonth]
  )

  const monthlySummary = useMemo(() => {
    const ownerPayments = monthlyPayments.filter((payment) =>
      isProjectOwner(projectById[payment.project_id || ''], currentUserId)
    )
    const assignedPayments = monthlyPayments.filter(
      (payment) => !isProjectOwner(projectById[payment.project_id || ''], currentUserId)
    )
    const clientPaid = paymentTotal(ownerPayments, 'client')
    const ownerFreelancerPaid = paymentTotal(ownerPayments, 'freelancer')
    const assignedPaid = paymentTotal(assignedPayments, 'freelancer')

    return {
      clientPaid,
      freelancerPaid: ownerFreelancerPaid + assignedPaid,
      ownerNet: clientPaid - ownerFreelancerPaid,
    }
  }, [currentUserId, monthlyPayments, projectById])

  const chartData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const map: Record<string, ChartPoint> = {}

    for (let day = 1; day <= daysInMonth; day += 1) {
      map[String(day)] = { day: String(day), client: 0, freelancer: 0 }
    }

    monthlyPayments.forEach((payment) => {
      if (!payment.date) return

      const day = String(Number(payment.date.slice(8, 10)) || new Date(payment.date).getDate())
      const project = projectById[payment.project_id || '']

      if (payment.type === 'client') {
        if (isProjectOwner(project, currentUserId)) {
          map[day].client += Number(payment.amount || 0)
        }
        return
      }

      map[day].freelancer += Number(payment.amount || 0)
    })

    return Object.values(map).sort((a, b) => Number(a.day) - Number(b.day))
  }, [currentUserId, monthlyPayments, projectById, selectedMonth])

  const revenueByType = useMemo<RevenuePoint[]>(() => {
    const totals: Record<string, number> = {}

    monthlyPayments.forEach((payment) => {
      if (payment.type !== 'client') return

      const project = projectById[payment.project_id || '']
      if (!isProjectOwner(project, currentUserId)) return

      const types = projectTypeValues(project)
      const amount = Number(payment.amount || 0)

      if (types.length === 0) {
        totals.uncategorized = (totals.uncategorized || 0) + amount
        return
      }

      const allocatedAmount = amount / types.length
      types.forEach((type) => {
        totals[type] = (totals[type] || 0) + allocatedAmount
      })
    })

    const typedRevenue = projectTypeOptions.map((option) => ({
      name: option.label,
      value: totals[option.value] || 0,
      color: option.chartColor,
    }))

    if (totals.uncategorized) {
      typedRevenue.push({
        name: 'Belum dikategorikan',
        value: totals.uncategorized,
        color: '#94a3b8',
      })
    }

    return typedRevenue
  }, [currentUserId, monthlyPayments, projectById])

  const totalTypeRevenue = revenueByType.reduce((total, item) => total + item.value, 0)

  const paymentsByProject = useMemo(() => {
    const map: Record<string, { client: number; freelancer: number }> = {}

    payments.forEach((payment) => {
      if (!payment.project_id) return

      if (!map[payment.project_id]) {
        map[payment.project_id] = { client: 0, freelancer: 0 }
      }

      map[payment.project_id][payment.type] += Number(payment.amount || 0)
    })

    return map
  }, [payments])

  const taskProgressByProject = useMemo(() => {
    const milestoneProject: Record<string, string> = {}
    const map: Record<string, { completed: number; total: number }> = {}

    milestones.forEach((milestone) => {
      milestoneProject[milestone.id] = milestone.project_id
      map[milestone.project_id] ||= { completed: 0, total: 0 }
    })

    milestoneTasks.forEach((task) => {
      const projectId = milestoneProject[task.milestone_id]
      if (!projectId) return

      map[projectId] ||= { completed: 0, total: 0 }
      map[projectId].total += 1
      if (task.is_completed) map[projectId].completed += 1
    })

    return map
  }, [milestoneTasks, milestones])

  const filteredProjects = useMemo(() => {
    let result = [...projects]
    const keyword = search.trim().toLowerCase()

    if (keyword) {
      result = result.filter(
        (project) =>
          project.name.toLowerCase().includes(keyword) ||
          project.client.toLowerCase().includes(keyword)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((project) => project.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      result = result.filter((project) => projectTypeValues(project).includes(typeFilter))
    }

    if (sortBy === 'newest') {
      result.sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
    } else if (sortBy === 'oldest') {
      result.sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      )
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'value') {
      result.sort((a, b) => {
        const aValue = isProjectOwner(a, currentUserId)
          ? financialsByProject[a.id].totalDeal
          : financialsByProject[a.id].internalCost
        const bValue = isProjectOwner(b, currentUserId)
          ? financialsByProject[b.id].totalDeal
          : financialsByProject[b.id].internalCost

        return bValue - aValue
      })
    } else if (sortBy === 'deadline') {
      result.sort((a, b) => {
        if (!a.deadline_at) return 1
        if (!b.deadline_at) return -1
        return new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime()
      })
    }

    return result
  }, [
    currentUserId,
    financialsByProject,
    projects,
    search,
    sortBy,
    statusFilter,
    typeFilter,
  ])

  const deadlineProjects = useMemo(
    () =>
      projects
        .filter((project) => project.deadline_at && project.status !== 'done')
        .sort(
          (a, b) =>
            new Date(a.deadline_at || 0).getTime() - new Date(b.deadline_at || 0).getTime()
        ),
    [projects]
  )

  const deadlinesByDate = useMemo(() => {
    const map: Record<string, Record<string, CalendarDeadlineGroup>> = {}
    const addDeadline = (
      key: string,
      projectId: string,
      title: string,
      type: CalendarDeadlineType
    ) => {
      map[key] ||= {}
      map[key][projectId] ||= { projectId, title, types: [] }
      if (!map[key][projectId].types.includes(type)) {
        map[key][projectId].types.push(type)
      }
    }

    deadlineProjects.forEach((project) => {
      if (!project.deadline_at) return
      const key = localDateKey(new Date(project.deadline_at))
      addDeadline(key, project.id, project.name, 'project')
    })

    milestones.forEach((milestone) => {
      const project = projectById[milestone.project_id]
      if (!milestone.deadline_at || milestone.status === 'done' || project?.status === 'done') return
      const key = localDateKey(new Date(milestone.deadline_at))
      addDeadline(key, milestone.project_id, project?.name || 'Project', 'milestone')
    })

    changeRequests.forEach((changeRequest) => {
      const project = projectById[changeRequest.project_id]
      if (
        !changeRequest.deadline_at ||
        changeRequest.status === 'done' ||
        project?.status === 'done'
      ) {
        return
      }
      const key = localDateKey(new Date(changeRequest.deadline_at))
      addDeadline(key, changeRequest.project_id, project?.name || 'Project', 'scope')
    })

    return Object.fromEntries(
      Object.entries(map).map(([key, value]) => [key, Object.values(value)])
    )
  }, [changeRequests, deadlineProjects, milestones, projectById])

  const notifications = useMemo<DashboardNotification[]>(() => {
    const items: DashboardNotification[] = []

    projects.forEach((project) => {
      if (
        project.status !== 'done' &&
        project.deadline_at &&
        shouldNotifyDeadline(project.deadline_at)
      ) {
        const state = deadlineState(project.deadline_at)
        items.push({
          id: `project-${project.id}`,
          projectId: project.id,
          title: project.name,
          detail: `Deadline project ${state.label.toLowerCase()}`,
          deadline: project.deadline_at,
          tone: state.tone === 'danger' ? 'danger' : 'warning',
        })
      }
    })

    milestones.forEach((milestone) => {
      const project = projectById[milestone.project_id]
      if (
        project?.status !== 'done' &&
        milestone.status !== 'done' &&
        milestone.deadline_at &&
        shouldNotifyDeadline(milestone.deadline_at)
      ) {
        const state = deadlineState(milestone.deadline_at)
        items.push({
          id: `milestone-${milestone.id}`,
          projectId: milestone.project_id,
          title: milestone.title,
          detail: `Milestone ${state.label.toLowerCase()}`,
          deadline: milestone.deadline_at,
          tone: state.tone === 'danger' ? 'danger' : 'warning',
        })
      }
    })

    changeRequests.forEach((changeRequest) => {
      const project = projectById[changeRequest.project_id]
      if (!project || project.status === 'done') return

      if (
        changeRequest.status === 'pending' &&
        isProjectOwner(project, currentUserId)
      ) {
        items.push({
          id: `change-pending-${changeRequest.id}`,
          projectId: changeRequest.project_id,
          title: changeRequest.title,
          detail: `Tambahan scope ${project.name} menunggu persetujuan`,
          deadline: changeRequest.deadline_at,
          tone: 'info',
        })
      } else if (
        changeRequest.status !== 'done' &&
        changeRequest.deadline_at &&
        shouldNotifyDeadline(changeRequest.deadline_at)
      ) {
        const state = deadlineState(changeRequest.deadline_at)
        items.push({
          id: `change-${changeRequest.id}`,
          projectId: changeRequest.project_id,
          title: changeRequest.title,
          detail: `Tambahan scope ${state.label.toLowerCase()}`,
          deadline: changeRequest.deadline_at,
          tone: state.tone === 'danger' ? 'danger' : 'warning',
        })
      }
    })

    return items.sort((a, b) => {
      const toneRank = { danger: 3, warning: 2, info: 1 }
      if (toneRank[a.tone] !== toneRank[b.tone]) return toneRank[b.tone] - toneRank[a.tone]
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    })
  }, [changeRequests, currentUserId, milestones, projectById, projects])

  const calendarDays = calendarCells(calendarMonth)
  const hasExternalAssignee = assignmentRows.some(
    (row) => row.assignedTo && row.assignedTo !== currentUserId
  )
  const formAssignmentDealTotal = assignmentDealTotal(
    assignmentRows.map((row) => ({
      id: row.id || row.projectType,
      project_id: editingProject?.id || '',
      project_type: row.projectType,
      assigned_to: row.assignedTo || currentUserId,
      role_label: row.roleLabel,
      deal_amount: Number(row.dealAmount || 0),
      internal_fee: row.assignedTo && row.assignedTo !== currentUserId ? Number(row.internalFee || 0) : 0,
    }))
  )
  const formAssignmentFeeTotal = assignmentExternalFeeTotal(
    assignmentRows.map((row) => ({
      id: row.id || row.projectType,
      project_id: editingProject?.id || '',
      project_type: row.projectType,
      assigned_to: row.assignedTo || currentUserId,
      role_label: row.roleLabel,
      deal_amount: Number(row.dealAmount || 0),
      internal_fee: row.assignedTo && row.assignedTo !== currentUserId ? Number(row.internalFee || 0) : 0,
    })),
    { created_by: currentUserId }
  )
  const deleteTarget = confirmAction?.type === 'delete' ? confirmAction.project : null
  const isLoggingOut = confirmAction?.type === 'logout'
  const todayLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading dashboard...
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-950">Dashboard tidak bisa dimuat</h1>
          <p className="mt-2 text-sm text-slate-500">{loadError}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={init}
              className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Ke Login
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#dfe3e6] p-0 text-slate-950 lg:p-6">
      <div className="mx-auto flex min-h-screen max-w-[1720px] overflow-hidden bg-[#f8f8f7] shadow-2xl shadow-slate-500/20 ring-1 ring-slate-200 lg:min-h-[calc(100vh-3rem)] lg:rounded-[28px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-[#f5f5f4] lg:flex lg:flex-col">
          <div className="flex h-[76px] items-center justify-between border-b border-slate-200 px-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
                u
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight text-slate-950">uiuxmart</p>
                <p className="text-xs font-medium text-slate-500">project workspace</p>
              </div>
            </div>
            <span className="text-xl text-slate-400">‹</span>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Main Menu
            </p>
            <div className="mt-3 space-y-1">
              {[
                ['Dashboard', summary.totalProjects],
                ['Cashflow', monthlyPayments.length],
                ['Deadline', deadlineProjects.length],
                ['Tambahan Scope', summary.pendingChanges],
              ].map(([label, count]) => (
                <button
                  key={label}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    label === 'Dashboard'
                      ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:bg-white hover:text-slate-950'
                  }`}
                >
                  <span>{label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {count}
                  </span>
                </button>
              ))}
            </div>

            <div className="my-6 border-t border-dashed border-slate-200" />

            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Workspace
            </p>
            <div className="mt-3 space-y-1">
              {projectTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTypeFilter(option.value)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: option.chartColor }}
                  />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-950">
                {currentUserName || currentUserEmail || 'User'}
              </p>
              {currentUserEmail && (
                <p className="mt-1 truncate text-xs text-slate-500">{currentUserEmail}</p>
              )}
              <button
                type="button"
                onClick={() => setConfirmAction({ type: 'logout' })}
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#fbfbfa]/95 backdrop-blur">
            <div className="flex min-h-[76px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
                  u
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-950">uiuxmart</p>
                  <p className="text-xs text-slate-500">workspace</p>
                </div>
              </div>

              <div className="hidden items-center gap-2 text-sm lg:flex">
                <span className="font-medium text-slate-400">Main Menu</span>
                <span className="text-slate-300">›</span>
                <span className="font-semibold text-slate-950">Dashboard</span>
              </div>

              <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:max-w-3xl">
                <div className="relative min-w-0 flex-1">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  >
                    <path d="m21 21-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" strokeLinecap="round" />
                  </svg>
                  <input
                    placeholder="Cari project atau client..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
                  />
                </div>

                <button
                  type="button"
                  onClick={openCreateProjectModal}
                  className="h-12 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Add Project +
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((current) => !current)}
                    className="relative grid h-12 w-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                    aria-label="Buka notifikasi"
                    aria-expanded={notificationsOpen}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                    >
                      <path
                        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {notifications.length > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                        {Math.min(notifications.length, 99)}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-14 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">Notifikasi</p>
                          <p className="text-xs text-slate-500">
                            Deadline 7 hari ke depan dan persetujuan scope
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {notifications.length}
                        </span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm text-slate-500">
                            Tidak ada hal mendesak saat ini.
                          </p>
                        ) : (
                          notifications.map((notification) => (
                            <Link
                              key={notification.id}
                              href={`/project/${notification.projectId}`}
                              onClick={() => setNotificationsOpen(false)}
                              className="flex gap-3 border-b border-slate-100 px-4 py-3 transition last:border-0 hover:bg-slate-50"
                            >
                              <span
                                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                                  notification.tone === 'danger'
                                    ? 'bg-red-500'
                                    : notification.tone === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-sky-500'
                                }`}
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-slate-900">
                                  {notification.title}
                                </span>
                                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                                  {notification.detail}
                                </span>
                                {notification.deadline && (
                                  <span className="mt-1 block text-[11px] font-medium text-slate-400">
                                    {formatDateTime(notification.deadline)}
                                  </span>
                                )}
                              </span>
                            </Link>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-7">
            <section className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">{todayLabel}</p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Kelola project uiuxmart dengan lebih rapi.
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Pantau deal, deadline, role freelancer, tambahan scope, dan cashflow dari satu
                  workspace yang lebih clean.
                </p>
              </div>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
              />
            </section>

        {notice && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm font-medium ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {notice.message}
          </div>
        )}

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Project</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{summary.totalProjects}</p>
            <p className="mt-1 text-xs text-slate-500">
              {summary.activeProjects} aktif, {summary.doneProjects} selesai
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Nilai Project</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              Rp {formatCompactRupiah(summary.ownerDeal)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {summary.ownedProjects} project milik sendiri
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Pendapatan Diterima</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">
              Rp {formatCompactRupiah(summary.ownerClientPaid)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Net setelah fee Rp {formatCompactRupiah(summary.ownerActualNet)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Estimasi Profit</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">
              Rp {formatCompactRupiah(summary.ownerProfit)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Deal aktif dikurangi seluruh fee
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Perlu Tindakan</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{notifications.length}</p>
            <p className="mt-1 text-xs text-slate-500">
              {summary.pendingChanges} scope menunggu persetujuan
            </p>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Cashflow Terlihat</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ringkasan pembayaran sesuai akses pada bulan pilihan
                </p>
              </div>

              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </div>

            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">Client Masuk</p>
                <p className="mt-1 text-base font-semibold text-emerald-600">
                  Rp {formatCompactRupiah(monthlySummary.clientPaid)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">Pekerjaan Dibayar</p>
                <p className="mt-1 text-base font-semibold text-amber-600">
                  Rp {formatCompactRupiah(monthlySummary.freelancerPaid)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">Net Owner</p>
                <p
                  className={`mt-1 text-base font-semibold ${
                    monthlySummary.ownerNet >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  Rp {formatCompactRupiah(monthlySummary.ownerNet)}
                </p>
              </div>
            </div>

            <div className="h-[340px] px-1 py-5 sm:px-5">
              {monthlyPayments.length === 0 ? (
                <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                  Belum ada payment terlihat di bulan ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: 0, right: 18, top: 12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="clientCashflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.03} />
                      </linearGradient>
                      <linearGradient id="freelancerCashflow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.24} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 6" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={18}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={78}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(value) => `Rp ${formatCompactRupiah(Number(value))}`}
                    />
                    <Tooltip
                      cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
                      contentStyle={{
                        borderRadius: 8,
                        borderColor: '#e2e8f0',
                        boxShadow: '0 10px 25px rgb(15 23 42 / 0.12)',
                      }}
                      formatter={(value) => `Rp ${formatRupiah(Number(value))}`}
                      labelFormatter={(label) => `Tanggal ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="client"
                      name="Client"
                      stroke="#059669"
                      fill="url(#clientCashflow)"
                      strokeWidth={2}
                      dot={{ r: 2, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="freelancer"
                      name="Pekerjaan"
                      stroke="#d97706"
                      fill="url(#freelancerCashflow)"
                      strokeWidth={2}
                      dot={{ r: 2, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="font-semibold text-slate-950">Pendapatan per Tipe</h2>
              <p className="text-sm text-slate-500">Payment client pada bulan pilihan</p>
            </div>

            <div className="relative mt-4 h-56">
              {totalTypeRevenue === 0 ? (
                <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
                  Belum ada pendapatan client di bulan ini.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByType.filter((item) => item.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={62}
                        outerRadius={88}
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
                      <p className="text-lg font-semibold text-slate-950">
                        Rp {formatCompactRupiah(totalTypeRevenue)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {revenueByType.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold text-slate-950">
                    Rp {formatCompactRupiah(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Kalender Deadline</h2>
                <p className="text-sm text-slate-500">
                  Project, milestone, dan tambahan scope aktif
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                  className="grid h-9 w-9 place-items-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Bulan sebelumnya"
                >
                  ‹
                </button>
                <p className="min-w-36 text-center text-sm font-semibold capitalize text-slate-800">
                  {monthLabel(calendarMonth)}
                </p>
                <button
                  type="button"
                  onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                  className="grid h-9 w-9 place-items-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Bulan berikutnya"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                <div key={day} className="py-2 text-xs font-semibold text-slate-400">
                  {day}
                </div>
              ))}
              {calendarDays.map((date, index) => {
                if (!date) return <div key={`blank-${index}`} className="min-h-16 sm:min-h-20" />

                const key = localDateKey(date)
                const dayProjects = deadlinesByDate[key] || []
                const isToday = key === localDateKey(new Date())

                return (
                  <div
                    key={key}
                    title={dayProjects
                      .map((item) => `${item.title}: ${item.types.join(', ')}`)
                      .join(' | ')}
                    className={`min-h-16 rounded-lg border p-2 text-left sm:min-h-20 ${
                      dayProjects.length
                        ? 'border-sky-200 bg-sky-50'
                        : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <span
                      className={`inline-grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-slate-950 text-white' : 'text-slate-600'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {dayProjects.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <span className="inline-flex rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {dayProjects.length} project
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(dayProjects.flatMap((item) => item.types))).map(
                            (type) => (
                              <span
                                key={type}
                                className={`h-1.5 w-1.5 rounded-full ${
                                  type === 'project'
                                    ? 'bg-rose-500'
                                    : type === 'milestone'
                                      ? 'bg-sky-500'
                                      : 'bg-violet-500'
                                }`}
                              />
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Project
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Milestone
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-500" />
                Tambahan scope
              </span>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Deadline Terdekat</h2>
              <p className="text-sm text-slate-500">Project aktif yang perlu diperhatikan</p>
            </div>
            <div className="divide-y divide-slate-200">
              {deadlineProjects.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Belum ada deadline aktif.</p>
              ) : (
                deadlineProjects.slice(0, 6).map((project) => {
                  const state = deadlineState(project.deadline_at)
                  return (
                    <Link
                      key={project.id}
                      href={`/project/${project.id}`}
                      className="block px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {project.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(project.deadline_at)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            state.tone === 'danger'
                              ? 'bg-red-50 text-red-700'
                              : state.tone === 'warning'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {state.label}
                        </span>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </aside>
        </section>

        <section>
          <div className="mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Project List</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredProjects.length} project sesuai filter saat ini
                </p>
              </div>

              <button
                type="button"
                onClick={openCreateProjectModal}
                className="hidden rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:inline-flex"
              >
                + Project
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${
                      statusFilter === option.value
                        ? 'bg-slate-950 text-white ring-slate-950'
                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:max-w-[420px] lg:grid-cols-[220px_180px]">
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as ProjectTypeFilter)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="all">Semua tipe project</option>
                  {projectTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="deadline">Deadline terdekat</option>
                  <option value="name">Nama A-Z</option>
                  <option value="value">Nilai terbesar</option>
                </select>
              </div>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Tidak ada project yang cocok dengan filter.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProjects.map((project) => {
                const ownsProject = isProjectOwner(project, currentUserId)
                const projectPayments = paymentsByProject[project.id] || {
                  client: 0,
                  freelancer: 0,
                }
                const financials = financialsByProject[project.id]
                const projectChanges = changeRequestsByProject[project.id] || []
                const totalDeal = financials.totalDeal
                const internalCost = financials.internalCost
                const visiblePaid = ownsProject ? projectPayments.client : projectPayments.freelancer
                const visibleTotal = ownsProject ? totalDeal : internalCost
                const workProgress = taskProgressByProject[project.id] || {
                  completed: project.status === 'done' ? 1 : 0,
                  total: project.status === 'done' ? 1 : 0,
                }
                const workPercentage = progressValue(workProgress.completed, workProgress.total)
                const assignee = project.assigned_to ? userById[project.assigned_to] : null
                const dueState =
                  project.status === 'done'
                    ? { label: 'Selesai', tone: 'neutral' as const }
                    : deadlineState(project.deadline_at)
                const isDeleting = deletingProjectId === project.id

                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                      <Link
                        href={`/project/${project.id}`}
                        className="block rounded outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                      >
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
                          <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-950">
                                {project.name}
                              </h3>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                                  project.status
                                )}`}
                              >
                                {statusLabel(project.status)}
                              </span>
                              {projectTypeValues(project).length === 0 ? (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                  Belum dikategorikan
                                </span>
                              ) : (
                                projectTypeValues(project).map((type) => (
                                  <span
                                    key={type}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${projectTypeClass(
                                      type
                                    )}`}
                                  >
                                    {projectTypeLabel(type)}
                                  </span>
                                ))
                              )}
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                              <span>{project.client}</span>
                              <span>Dibuat {formatShortDate(project.created_at)}</span>
                              <span>
                                {ownsProject
                                  ? assignee
                                    ? `Dikerjakan ${userLabel(assignee)}`
                                    : 'Belum di-assign'
                                  : 'Ditugaskan ke saya'}
                              </span>
                              {projectChanges.length > 0 && <span>{projectChanges.length} tambahan scope</span>}
                            </div>

                            {project.deadline_at && (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                <span className="font-medium text-slate-500">
                                  Deadline {formatDateTime(project.deadline_at)}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 font-semibold ${
                                    dueState.tone === 'danger'
                                      ? 'bg-red-50 text-red-700'
                                      : dueState.tone === 'warning'
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {dueState.label}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                              <span className="font-medium text-slate-700">Progress pekerjaan</span>
                              <span className="font-semibold text-slate-950">
                                {workProgress.total
                                  ? `${workProgress.completed}/${workProgress.total} task`
                                  : 'Belum ada task'}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-sky-500"
                                style={{ width: `${workPercentage}%` }}
                              />
                            </div>

                            <div className="mt-2 flex justify-between gap-3 text-xs text-slate-500">
                              <span>
                                Terbayar Rp {formatRupiah(visiblePaid)} / Rp{' '}
                                {formatRupiah(visibleTotal)}
                              </span>
                              {ownsProject && (
                                <span>Profit Rp {formatRupiah(financials.profit)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>

                      {ownsProject && (
                        <div className="relative flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionProjectId(
                                openActionProjectId === project.id ? '' : project.id
                              )
                            }
                            className="grid h-9 w-9 place-items-center rounded-full border border-slate-300 bg-white transition hover:bg-slate-50"
                            aria-label={`Action untuk ${project.name}`}
                            aria-expanded={openActionProjectId === project.id}
                          >
                            <span className="flex flex-col gap-0.5">
                              <span className="block h-1 w-1 rounded-full bg-slate-700" />
                              <span className="block h-1 w-1 rounded-full bg-slate-700" />
                              <span className="block h-1 w-1 rounded-full bg-slate-700" />
                            </span>
                          </button>

                          {openActionProjectId === project.id && (
                            <div className="absolute right-0 top-11 z-20 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => openEditProjectModal(project)}
                                className="block w-full px-4 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteProject(project)}
                                disabled={isDeleting}
                                className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting ? 'Hapus...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {projectModalMode && (
          <Modal
            title={projectModalMode === 'edit' ? 'Edit Project' : 'Tambah Project'}
            description="Detail scope dan deadline bisa dikembangkan lagi melalui milestone."
            onClose={closeProjectModal}
            maxWidth="max-w-2xl"
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Nama project</span>
                  <input
                    placeholder="Nama project"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Client</span>
                  <input
                    placeholder="Nama client"
                    value={client}
                    onChange={(event) => setClient(event.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                  />
                </label>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Tipe project
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {projectTypeOptions.map((option) => {
                      const checked = projectTypes.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleProjectType(option.value)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                            checked
                              ? 'border-slate-950 bg-slate-950 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Deadline project
                  </span>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Deal client</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={deal}
                  onChange={(event) => setDeal(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                />
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Pembagian kerja & fee
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Satu project bisa punya beberapa role. Freelancer hanya akan melihat scope,
                      milestone, dan payment yang terhubung ke role miliknya.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addAssignmentRow()}
                    className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    + Role
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {assignmentRows.map((row, index) => {
                    const isExternal = Boolean(row.assignedTo && row.assignedTo !== currentUserId)

                    return (
                      <div
                        key={`${row.id || row.projectType}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Tipe kerja
                            </span>
                            <select
                              value={row.projectType}
                              onChange={(event) =>
                                updateAssignmentRow(index, {
                                  projectType: event.target.value as ProjectType,
                                })
                              }
                              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                            >
                              {projectTypes.map((type) => (
                                <option key={type} value={type}>
                                  {projectTypeLabel(type)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Nama role
                            </span>
                            <input
                              value={row.roleLabel}
                              onChange={(event) =>
                                updateAssignmentRow(index, { roleLabel: event.target.value })
                              }
                              placeholder="Contoh: Program / Naskah"
                              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                            />
                          </label>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_150px_150px_auto] md:items-end">
                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Pelaksana
                            </span>
                            <select
                              value={row.assignedTo}
                              onChange={(event) =>
                                updateAssignmentRow(index, { assignedTo: event.target.value })
                              }
                              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                            >
                              <option value="">Belum di-assign</option>
                              {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.id === currentUserId
                                    ? `${userLabel(user)} (Saya)`
                                    : userLabel(user)}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Porsi deal
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={row.dealAmount}
                              onChange={(event) =>
                                updateAssignmentRow(index, { dealAmount: event.target.value })
                              }
                              placeholder="0"
                              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                            />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-medium text-slate-600">
                              Fee freelancer
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={isExternal ? row.internalFee : ''}
                              onChange={(event) =>
                                updateAssignmentRow(index, { internalFee: event.target.value })
                              }
                              placeholder={isExternal ? '0' : 'Fee 0'}
                              disabled={!isExternal}
                              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => removeAssignmentRow(index)}
                            disabled={assignmentRows.length === 1}
                            className="rounded border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-slate-500">Total porsi role</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      Rp {formatRupiah(formAssignmentDealTotal)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-slate-500">Total fee eksternal</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      Rp {formatRupiah(formAssignmentFeeTotal)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-slate-500">Sisa belum dialokasikan</p>
                    <p className="mt-1 font-semibold text-slate-950">
                      Rp {formatRupiah(Math.max(0, Number(deal || 0) - formAssignmentDealTotal))}
                    </p>
                  </div>
                </div>
              </div>

              {projectModalMode === 'create' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-emerald-900">
                      Down payment diterima
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                      Opsional. Jika diisi, payment client pertama otomatis dicatat setelah project
                      tersimpan.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-emerald-900">
                        Nominal DP
                      </span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={downPayment}
                        onChange={(event) => setDownPayment(event.target.value)}
                        className="w-full rounded border border-emerald-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-emerald-900">
                        Tanggal DP
                      </span>
                      <input
                        type="date"
                        value={downPaymentDate}
                        onChange={(event) => setDownPaymentDate(event.target.value)}
                        className="w-full rounded border border-emerald-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                      />
                    </label>
                  </div>
                </div>
              )}

              {formError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {formError}
                </p>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Estimasi profit</p>
                <p className="mt-1 text-xl font-semibold text-emerald-600">
                  Rp {formatRupiah(Number(deal || 0) - formAssignmentFeeTotal)}
                </p>
                {!hasExternalAssignee && (
                  <p className="mt-1 text-xs text-emerald-700">
                    Semua role dikerjakan internal/saya, jadi tidak ada fee eksternal.
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeProjectModal}
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveProject}
                  disabled={savingProject}
                  className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProject
                    ? 'Menyimpan...'
                    : projectModalMode === 'edit'
                      ? 'Update Project'
                      : 'Simpan Project'}
                </button>
              </div>
            </div>
          </Modal>
        )}
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={openCreateProjectModal}
        className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-slate-950 text-white shadow-xl shadow-slate-950/25 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300 sm:hidden"
        aria-label="Tambah project"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-6 w-6"
        >
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </button>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus project?"
        description={
          deleteTarget
            ? `Project "${deleteTarget.name}" akan dihapus bersama payment, tambahan scope, milestone, task, dan update.`
            : ''
        }
        confirmLabel="Delete Project"
        variant="danger"
        busy={Boolean(deletingProjectId)}
        onCancel={() => {
          if (!deletingProjectId) setConfirmAction(null)
        }}
        onConfirm={confirmDeleteProject}
      />

      <ConfirmDialog
        open={isLoggingOut}
        title="Logout dari dashboard?"
        description="Sesi aktif akan ditutup dan kamu akan kembali ke halaman login."
        confirmLabel="Logout"
        busy={loggingOut}
        onCancel={() => setConfirmAction(null)}
        onConfirm={confirmLogout}
      />
    </main>
  )
}
