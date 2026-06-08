'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'
import {
  type AppUser,
  type ChangeRequest,
  type Milestone,
  type MilestoneTask,
  type Payment,
  type Project,
  type ProjectAssignment,
  isProjectAssignee,
  isProjectOwner,
  projectFinancials,
  projectTypeOptions,
  projectTypeValues,
  progressValue,
} from '@/lib/project-utils'

export type ChartPoint = {
  day: string
  client: number
  freelancer: number
}

export type RevenuePoint = {
  name: string
  value: number
  color: string
}

export type DeadlineItem = {
  id: string
  projectId: string
  projectName: string
  title: string
  type: 'project' | 'milestone' | 'scope'
  deadline: string
  status?: string
}

export function paymentTotal(payments: Payment[], type: Payment['type']) {
  return payments
    .filter((payment) => payment.type === type)
    .reduce((acc, payment) => acc + Number(payment.amount || 0), 0)
}

export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function shiftMonth(value: string, amount: number) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}

export function calendarCells(value: string) {
  const [year, month] = value.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const mondayOffset = (firstDay.getDay() + 6) % 7

  return [
    ...Array.from({ length: mondayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month - 1, index + 1)),
  ]
}

export function shouldNotifyDeadline(deadline?: string | null) {
  if (!deadline) return false
  return new Date(deadline).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
}

export function useWorkspaceData() {
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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const fetchAll = useCallback(
    async (userId = currentUserId) => {
      if (!userId) return

      const [usersResult, projectsResult] = await Promise.all([
        supabase.from('users').select('id,name,email').order('name'),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
      ])

      if (projectsResult.error) throw projectsResult.error

      const userRows = usersResult.error ? [] : ((usersResult.data as AppUser[] | null) || [])
      const projectRows = (projectsResult.data as Project[] | null) || []
      const projectIds = projectRows.map((project) => project.id)

      setUsers(userRows)
      setCurrentUserName(userRows.find((user) => user.id === userId)?.name || '')

      let paymentRows: Payment[] = []
      let milestoneRows: Milestone[] = []
      let taskRows: MilestoneTask[] = []
      let changeRequestRows: ChangeRequest[] = []
      let assignmentRows: ProjectAssignment[] = []

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

        assignmentRows = (assignmentsResult.data as ProjectAssignment[] | null) || []
        const rawPayments = (paymentsResult.data as Payment[] | null) || []
        paymentRows = rawPayments.filter((payment) => {
          const project = projectRows.find((item) => item.id === payment.project_id)
          const projectRoleIds = assignmentRows
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
      setProjectAssignments(assignmentRows)
    },
    [currentUserId]
  )

  useEffect(() => {
    async function init() {
      setLoading(true)
      setLoadError('')

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

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
        setLoadError('Workspace gagal dimuat. Jalankan migrasi Supabase terbaru lalu coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [fetchAll, router])

  const userById = useMemo(() => {
    const map: Record<string, AppUser> = {}
    users.forEach((user) => {
      map[user.id] = user
    })
    return map
  }, [users])

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

  const chartData = useMemo<ChartPoint[]>(() => {
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
        if (isProjectOwner(project, currentUserId)) map[day].client += Number(payment.amount || 0)
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

  const paymentsByProject = useMemo(() => {
    const map: Record<string, { client: number; freelancer: number }> = {}

    payments.forEach((payment) => {
      if (!payment.project_id) return
      map[payment.project_id] ||= { client: 0, freelancer: 0 }
      map[payment.project_id][payment.type] += Number(payment.amount || 0)
    })

    return map
  }, [payments])

  const taskProgressByProject = useMemo(() => {
    const milestoneProject: Record<string, string> = {}
    const map: Record<string, { completed: number; total: number; percentage: number }> = {}

    milestones.forEach((milestone) => {
      milestoneProject[milestone.id] = milestone.project_id
      map[milestone.project_id] ||= { completed: 0, total: 0, percentage: 0 }
    })

    milestoneTasks.forEach((task) => {
      const projectId = milestoneProject[task.milestone_id]
      if (!projectId) return

      map[projectId] ||= { completed: 0, total: 0, percentage: 0 }
      map[projectId].total += 1
      if (task.is_completed) map[projectId].completed += 1
      map[projectId].percentage = progressValue(map[projectId].completed, map[projectId].total)
    })

    return map
  }, [milestoneTasks, milestones])

  const deadlines = useMemo<DeadlineItem[]>(() => {
    const items: DeadlineItem[] = []

    projects.forEach((project) => {
      if (project.deadline_at && project.status !== 'done') {
        items.push({
          id: `project-${project.id}`,
          projectId: project.id,
          projectName: project.name,
          title: project.name,
          type: 'project',
          deadline: project.deadline_at,
          status: project.status,
        })
      }
    })

    milestones.forEach((milestone) => {
      const project = projectById[milestone.project_id]
      if (milestone.deadline_at && milestone.status !== 'done' && project?.status !== 'done') {
        items.push({
          id: `milestone-${milestone.id}`,
          projectId: milestone.project_id,
          projectName: project?.name || 'Project',
          title: milestone.title,
          type: 'milestone',
          deadline: milestone.deadline_at,
          status: milestone.status,
        })
      }
    })

    changeRequests.forEach((scope) => {
      const project = projectById[scope.project_id]
      if (scope.deadline_at && scope.status !== 'done' && project?.status !== 'done') {
        items.push({
          id: `scope-${scope.id}`,
          projectId: scope.project_id,
          projectName: project?.name || 'Project',
          title: scope.title,
          type: 'scope',
          deadline: scope.deadline_at,
          status: scope.status,
        })
      }
    })

    return items.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
  }, [changeRequests, milestones, projectById, projects])

  return {
    projects,
    payments,
    milestones,
    milestoneTasks,
    changeRequests,
    projectAssignments,
    users,
    userById,
    projectById,
    currentUserId,
    currentUserEmail,
    currentUserName,
    loading,
    loadError,
    selectedMonth,
    setSelectedMonth,
    fetchAll,
    ownedProjects,
    assignedProjects,
    summary,
    monthlyPayments,
    monthlySummary,
    chartData,
    revenueByType,
    paymentsByProject,
    taskProgressByProject,
    changeRequestsByProject,
    assignmentsByProject,
    financialsByProject,
    deadlines,
  }
}
