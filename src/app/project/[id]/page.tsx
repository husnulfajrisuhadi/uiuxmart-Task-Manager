'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ConfirmDialog, Modal } from '@/components/Modal'
import { supabase } from '@/lib/supabase'
import {
  type ChangeRequest,
  type ChangeRequestStatus,
  type Milestone,
  type MilestoneStatus,
  type MilestoneTask,
  type Payment,
  type PaymentType,
  type Project,
  type ProjectStatus,
  type ProjectUpdate,
  changeRequestStatusClass,
  changeRequestStatusLabel,
  changeRequestStatusOptions,
  deadlineState,
  formatDateTime,
  formatRupiah,
  formatShortDate,
  isProjectAssignee,
  isProjectOwner,
  milestoneStatusClass,
  milestoneStatusLabel,
  milestoneStatusOptions,
  paymentTypeLabel,
  progressValue,
  projectFinancials,
  projectPriorityClass,
  projectPriorityLabel,
  projectStatusOptions,
  projectTypeClass,
  projectTypeLabel,
  statusClass,
  statusLabel,
  taskProgress,
  toDateTimeLocal,
} from '@/lib/project-utils'

type ModalType = 'payment' | 'update' | 'milestone' | 'change' | null

export default function ProjectDetail() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string)

  const [project, setProject] = useState<Project | null>(null)
  const [updates, setUpdates] = useState<ProjectUpdate[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [milestoneTasks, setMilestoneTasks] = useState<MilestoneTask[]>([])
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')

  const [currentUserId, setCurrentUserId] = useState('')
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const [note, setNote] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('ongoing')
  const [updateMilestoneId, setUpdateMilestoneId] = useState('')
  const [savingUpdate, setSavingUpdate] = useState(false)
  const [updateError, setUpdateError] = useState('')

  const [payType, setPayType] = useState<PaymentType>('client')
  const [amount, setAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0])
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [confirmDuplicatePayment, setConfirmDuplicatePayment] = useState(false)

  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDescription, setMilestoneDescription] = useState('')
  const [milestoneStatus, setMilestoneStatus] = useState<MilestoneStatus>('planned')
  const [milestoneDeadline, setMilestoneDeadline] = useState('')
  const [milestoneError, setMilestoneError] = useState('')
  const [savingMilestone, setSavingMilestone] = useState(false)
  const [deletingMilestone, setDeletingMilestone] = useState<Milestone | null>(null)
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({})
  const [busyTaskId, setBusyTaskId] = useState('')
  const [busyMilestoneId, setBusyMilestoneId] = useState('')

  const [editingChangeRequest, setEditingChangeRequest] = useState<ChangeRequest | null>(null)
  const [changeTitle, setChangeTitle] = useState('')
  const [changeDescription, setChangeDescription] = useState('')
  const [changeStatus, setChangeStatus] = useState<ChangeRequestStatus>('pending')
  const [changeDeal, setChangeDeal] = useState('')
  const [changeCost, setChangeCost] = useState('')
  const [changeDeadline, setChangeDeadline] = useState('')
  const [changeMilestoneId, setChangeMilestoneId] = useState('')
  const [createChangeMilestone, setCreateChangeMilestone] = useState(true)
  const [changeError, setChangeError] = useState('')
  const [savingChange, setSavingChange] = useState(false)
  const [deletingChange, setDeletingChange] = useState<ChangeRequest | null>(null)
  const [busyChangeId, setBusyChangeId] = useState('')

  const canManageProject = isProjectOwner(project, currentUserId)
  const canManageWork =
    isProjectOwner(project, currentUserId) || isProjectAssignee(project, currentUserId)

  async function init() {
    setLoading(true)
    setLoadError('')
    setNotice('')

    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      const userId = data.user?.id

      if (!userId) {
        router.replace('/login')
        return
      }

      setCurrentUserId(userId)
      await fetchAll(userId)
    } catch (error) {
      console.error(error)
      setLoadError('Project gagal dimuat. Jalankan migrasi Supabase terbaru lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchAll(userId = currentUserId) {
    if (!userId) return

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .maybeSingle()

    if (projectError) throw projectError

    const projectRow = (projectData as Project | null) || null

    if (!projectRow) {
      setProject(null)
      setUpdates([])
      setPayments([])
      setMilestones([])
      setMilestoneTasks([])
      setChangeRequests([])
      return
    }

    const [updatesResult, paymentsResult, milestonesResult, changeRequestsResult] =
      await Promise.all([
      supabase
        .from('updates')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('change_requests')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (updatesResult.error) throw updatesResult.error
    if (paymentsResult.error) throw paymentsResult.error
    if (milestonesResult.error) throw milestonesResult.error
    if (changeRequestsResult.error) throw changeRequestsResult.error

    const milestoneRows = (milestonesResult.data as Milestone[] | null) || []
    const milestoneIds = milestoneRows.map((milestone) => milestone.id)
    let taskRows: MilestoneTask[] = []

    if (milestoneIds.length > 0) {
      const { data: taskData, error: taskError } = await supabase
        .from('milestone_tasks')
        .select('*')
        .in('milestone_id', milestoneIds)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (taskError) throw taskError
      taskRows = (taskData as MilestoneTask[] | null) || []
    }

    const rawPayments = (paymentsResult.data as Payment[] | null) || []
    const visiblePayments = rawPayments.filter(
      (payment) => isProjectOwner(projectRow, userId) || payment.type === 'freelancer'
    )

    setProject(projectRow)
    setStatus((projectRow.status as ProjectStatus) || 'ongoing')
    setUpdates((updatesResult.data as ProjectUpdate[] | null) || [])
    setPayments(visiblePayments)
    setMilestones(milestoneRows)
    setMilestoneTasks(taskRows)
    setChangeRequests((changeRequestsResult.data as ChangeRequest[] | null) || [])
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (id) void init()
    }, 0)

    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addUpdate() {
    setUpdateError('')
    setNotice('')

    const trimmedNote = note.trim()

    if (!trimmedNote) {
      setUpdateError('Catatan update wajib diisi.')
      return
    }

    setSavingUpdate(true)

    const { error } = await supabase.from('updates').insert({
      project_id: id,
      milestone_id: updateMilestoneId || null,
      note: trimmedNote,
      status,
    })

    if (error) {
      setSavingUpdate(false)
      console.error(error)
      setUpdateError('Gagal simpan update.')
      return
    }

    const { error: statusError } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', id)
      .or(`created_by.eq.${currentUserId},assigned_to.eq.${currentUserId}`)

    setSavingUpdate(false)

    if (statusError) {
      console.error(statusError)
      setUpdateError('Update tersimpan, tetapi status project gagal diubah.')
      await fetchAll()
      return
    }

    setNote('')
    setUpdateMilestoneId('')
    setActiveModal(null)
    setNotice('Update project tersimpan.')
    await fetchAll()
  }

  const summary = useMemo(() => {
    const financials = projectFinancials(project, changeRequests)
    const { totalDeal, internalCost } = financials

    const clientPaid = payments
      .filter((payment) => payment.type === 'client')
      .reduce((acc, payment) => acc + Number(payment.amount || 0), 0)

    const freelancerPaid = payments
      .filter((payment) => payment.type === 'freelancer')
      .reduce((acc, payment) => acc + Number(payment.amount || 0), 0)

    return {
      ...financials,
      clientPaid,
      freelancerPaid,
      clientRemaining: totalDeal - clientPaid,
      freelancerRemaining: internalCost - freelancerPaid,
      clientDone: clientPaid >= totalDeal,
      freelancerDone: freelancerPaid >= internalCost,
    }
  }, [changeRequests, payments, project])

  const hasFreelancer = summary.hasExternalAssignee

  const visiblePayments = useMemo(
    () => payments.filter((payment) => (canManageProject ? true : payment.type === 'freelancer')),
    [payments, canManageProject]
  )

  async function addPayment(skipDuplicateCheck = false) {
    setPaymentError('')
    setNotice('')

    if (!canManageProject) {
      setPaymentError('Payment hanya bisa ditambahkan oleh pembuat project.')
      return
    }

    if (!amount || !payDate) {
      setPaymentError('Nominal dan tanggal wajib diisi.')
      return
    }

    if (payType === 'freelancer' && !hasFreelancer) {
      setPaymentError('Project ini dikerjakan sendiri sehingga tidak memiliki fee freelancer.')
      return
    }

    const nominal = Number(amount)

    if (Number.isNaN(nominal) || nominal <= 0) {
      setPaymentError('Nominal harus lebih dari 0.')
      return
    }

    if (payType === 'client' && nominal > summary.clientRemaining) {
      setPaymentError(`Melebihi sisa client Rp ${formatRupiah(summary.clientRemaining)}.`)
      return
    }

    if (payType === 'freelancer' && nominal > summary.freelancerRemaining) {
      setPaymentError(`Melebihi sisa freelancer Rp ${formatRupiah(summary.freelancerRemaining)}.`)
      return
    }

    const sameDay = payments.find((payment) => payment.type === payType && payment.date === payDate)

    if (sameDay && !skipDuplicateCheck) {
      setConfirmDuplicatePayment(true)
      return
    }

    setSavingPayment(true)

    const { error } = await supabase.from('payments').insert({
      project_id: id,
      type: payType,
      amount: nominal,
      note: payNote.trim() || null,
      date: payDate,
    })

    setSavingPayment(false)

    if (error) {
      console.error(error)
      setPaymentError('Gagal simpan payment.')
      return
    }

    setAmount('')
    setPayNote('')
    setActiveModal(null)
    setConfirmDuplicatePayment(false)
    setNotice('Payment tersimpan.')
    await fetchAll()
  }

  function resetMilestoneForm() {
    setEditingMilestone(null)
    setMilestoneTitle('')
    setMilestoneDescription('')
    setMilestoneStatus('planned')
    setMilestoneDeadline('')
    setMilestoneError('')
  }

  function openNewMilestone() {
    resetMilestoneForm()
    setActiveModal('milestone')
  }

  function openEditMilestone(milestone: Milestone) {
    setEditingMilestone(milestone)
    setMilestoneTitle(milestone.title)
    setMilestoneDescription(milestone.description || '')
    setMilestoneStatus(milestone.status as MilestoneStatus)
    setMilestoneDeadline(toDateTimeLocal(milestone.deadline_at))
    setMilestoneError('')
    setActiveModal('milestone')
  }

  function closeMilestoneModal() {
    setActiveModal(null)
    resetMilestoneForm()
  }

  async function saveMilestone() {
    setMilestoneError('')
    setNotice('')

    const title = milestoneTitle.trim()
    if (!title) {
      setMilestoneError('Nama milestone wajib diisi.')
      return
    }

    if (milestoneDeadline && Number.isNaN(new Date(milestoneDeadline).getTime())) {
      setMilestoneError('Deadline milestone tidak valid.')
      return
    }

    setSavingMilestone(true)

    const payload = {
      title,
      description: milestoneDescription.trim() || null,
      status: milestoneStatus,
      deadline_at: milestoneDeadline ? new Date(milestoneDeadline).toISOString() : null,
    }

    const result = editingMilestone
      ? await supabase.from('milestones').update(payload).eq('id', editingMilestone.id).select('id')
      : await supabase
          .from('milestones')
          .insert({
            ...payload,
            project_id: id,
            sort_order: milestones.length,
          })
          .select('id')

    setSavingMilestone(false)

    if (result.error) {
      console.error(result.error)
      setMilestoneError(editingMilestone ? 'Gagal update milestone.' : 'Gagal tambah milestone.')
      return
    }

    closeMilestoneModal()
    setNotice(editingMilestone ? 'Milestone berhasil diupdate.' : 'Milestone baru ditambahkan.')
    await fetchAll()
  }

  async function updateMilestoneStatus(milestoneId: string, nextStatus: MilestoneStatus) {
    setBusyMilestoneId(milestoneId)
    setNotice('')

    const { error } = await supabase
      .from('milestones')
      .update({ status: nextStatus })
      .eq('id', milestoneId)

    setBusyMilestoneId('')

    if (error) {
      console.error(error)
      setNotice('Status milestone gagal diubah.')
      return
    }

    await fetchAll()
  }

  async function confirmDeleteMilestone() {
    if (!deletingMilestone) return

    setBusyMilestoneId(deletingMilestone.id)
    const { error } = await supabase.from('milestones').delete().eq('id', deletingMilestone.id)
    setBusyMilestoneId('')

    if (error) {
      console.error(error)
      setNotice('Milestone gagal dihapus.')
      return
    }

    setDeletingMilestone(null)
    setNotice('Milestone dan task di dalamnya berhasil dihapus.')
    await fetchAll()
  }

  function resetChangeForm() {
    setEditingChangeRequest(null)
    setChangeTitle('')
    setChangeDescription('')
    setChangeStatus('pending')
    setChangeDeal('')
    setChangeCost('')
    setChangeDeadline('')
    setChangeMilestoneId('')
    setCreateChangeMilestone(true)
    setChangeError('')
  }

  function openNewChangeRequest() {
    resetChangeForm()
    setActiveModal('change')
  }

  function openEditChangeRequest(changeRequest: ChangeRequest) {
    setEditingChangeRequest(changeRequest)
    setChangeTitle(changeRequest.title)
    setChangeDescription(changeRequest.description || '')
    setChangeStatus(changeRequest.status as ChangeRequestStatus)
    setChangeDeal(String(changeRequest.additional_deal || ''))
    setChangeCost(String(changeRequest.additional_cost || ''))
    setChangeDeadline(toDateTimeLocal(changeRequest.deadline_at))
    setChangeMilestoneId(changeRequest.milestone_id || '')
    setCreateChangeMilestone(false)
    setChangeError('')
    setActiveModal('change')
  }

  function closeChangeModal() {
    setActiveModal(null)
    resetChangeForm()
  }

  async function saveChangeRequest() {
    setChangeError('')
    setNotice('')

    if (!canManageProject) {
      setChangeError('Change request finansial hanya dapat dikelola pembuat project.')
      return
    }

    const title = changeTitle.trim()
    const additionalDeal = Number(changeDeal || 0)
    const additionalCost = hasFreelancer ? Number(changeCost || 0) : 0

    if (!title) {
      setChangeError('Nama change request wajib diisi.')
      return
    }

    if (
      Number.isNaN(additionalDeal) ||
      Number.isNaN(additionalCost) ||
      additionalDeal < 0 ||
      additionalCost < 0
    ) {
      setChangeError('Nilai tambahan harus berupa angka yang valid.')
      return
    }

    if (additionalCost > additionalDeal) {
      setChangeError('Tambahan fee freelancer tidak boleh melebihi tambahan deal.')
      return
    }

    if (changeDeadline && Number.isNaN(new Date(changeDeadline).getTime())) {
      setChangeError('Deadline change request tidak valid.')
      return
    }

    setSavingChange(true)

    const payload = {
      title,
      description: changeDescription.trim() || null,
      status: changeStatus,
      additional_deal: additionalDeal,
      additional_cost: additionalCost,
      deadline_at: changeDeadline ? new Date(changeDeadline).toISOString() : null,
      milestone_id: changeMilestoneId || null,
    }

    const result = editingChangeRequest
      ? await supabase
          .from('change_requests')
          .update(payload)
          .eq('id', editingChangeRequest.id)
          .select('id')
          .single()
      : await supabase
          .from('change_requests')
          .insert({ ...payload, project_id: id })
          .select('id')
          .single()

    if (result.error) {
      setSavingChange(false)
      console.error(result.error)
      setChangeError(
        editingChangeRequest ? 'Gagal update change request.' : 'Gagal menambah change request.'
      )
      return
    }

    const shouldCreateMilestone =
      createChangeMilestone && !changeMilestoneId && !editingChangeRequest?.milestone_id

    if (shouldCreateMilestone) {
      const mappedStatus: MilestoneStatus =
        changeStatus === 'in_progress'
          ? 'in_progress'
          : changeStatus === 'done'
            ? 'done'
            : 'planned'

      const { data: milestoneData, error: milestoneError } = await supabase
        .from('milestones')
        .insert({
          project_id: id,
          title: `CR: ${title}`,
          description: changeDescription.trim() || 'Scope tambahan dari change request.',
          status: mappedStatus,
          deadline_at: changeDeadline ? new Date(changeDeadline).toISOString() : null,
          sort_order: milestones.length,
        })
        .select('id')
        .single()

      if (milestoneError) {
        setSavingChange(false)
        console.error(milestoneError)
        closeChangeModal()
        setNotice('Change request tersimpan, tetapi milestone otomatis gagal dibuat.')
        await fetchAll()
        return
      }

      const { error: linkError } = await supabase
        .from('change_requests')
        .update({ milestone_id: milestoneData.id })
        .eq('id', result.data.id)

      if (linkError) console.error(linkError)
    }

    setSavingChange(false)
    closeChangeModal()
    setNotice(
      editingChangeRequest
        ? 'Change request berhasil diupdate.'
        : 'Change request tersimpan dan siap dilacak.'
    )
    await fetchAll()
  }

  async function updateChangeRequestStatus(
    changeRequest: ChangeRequest,
    nextStatus: ChangeRequestStatus
  ) {
    setBusyChangeId(changeRequest.id)
    setNotice('')

    const { error } = await supabase
      .from('change_requests')
      .update({ status: nextStatus })
      .eq('id', changeRequest.id)

    if (!error && changeRequest.milestone_id) {
      const mappedStatus: MilestoneStatus =
        nextStatus === 'in_progress'
          ? 'in_progress'
          : nextStatus === 'done'
            ? 'done'
            : 'planned'
      const { error: milestoneError } = await supabase
        .from('milestones')
        .update({ status: mappedStatus })
        .eq('id', changeRequest.milestone_id)

      if (milestoneError) console.error(milestoneError)
    }

    setBusyChangeId('')

    if (error) {
      console.error(error)
      setNotice('Status change request gagal diubah.')
      return
    }

    setNotice('Status change request diperbarui.')
    await fetchAll()
  }

  async function confirmDeleteChangeRequest() {
    if (!deletingChange) return

    setBusyChangeId(deletingChange.id)
    const { error } = await supabase.from('change_requests').delete().eq('id', deletingChange.id)
    setBusyChangeId('')

    if (error) {
      console.error(error)
      setNotice('Change request gagal dihapus.')
      return
    }

    setDeletingChange(null)
    setNotice('Change request berhasil dihapus. Milestone terkait tetap disimpan.')
    await fetchAll()
  }

  async function addTask(milestone: Milestone) {
    const title = (taskInputs[milestone.id] || '').trim()
    if (!title) return

    const existingTasks = milestoneTasks.filter((task) => task.milestone_id === milestone.id)
    setBusyMilestoneId(milestone.id)

    const { error } = await supabase.from('milestone_tasks').insert({
      milestone_id: milestone.id,
      title,
      sort_order: existingTasks.length,
    })

    setBusyMilestoneId('')

    if (error) {
      console.error(error)
      setNotice('Task gagal ditambahkan.')
      return
    }

    setTaskInputs((current) => ({ ...current, [milestone.id]: '' }))
    await fetchAll()
  }

  async function toggleTask(task: MilestoneTask) {
    setBusyTaskId(task.id)
    const nextCompleted = !task.is_completed

    const { error } = await supabase
      .from('milestone_tasks')
      .update({
        is_completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
      })
      .eq('id', task.id)

    setBusyTaskId('')

    if (error) {
      console.error(error)
      setNotice('Status task gagal diubah.')
      return
    }

    await fetchAll()
  }

  async function deleteTask(task: MilestoneTask) {
    setBusyTaskId(task.id)
    const { error } = await supabase.from('milestone_tasks').delete().eq('id', task.id)
    setBusyTaskId('')

    if (error) {
      console.error(error)
      setNotice('Task gagal dihapus.')
      return
    }

    await fetchAll()
  }

  const tasksByMilestone = useMemo(() => {
    const map: Record<string, MilestoneTask[]> = {}

    milestones.forEach((milestone) => {
      map[milestone.id] = []
    })
    milestoneTasks.forEach((task) => {
      map[task.milestone_id] ||= []
      map[task.milestone_id].push(task)
    })

    return map
  }, [milestoneTasks, milestones])

  const milestoneById = useMemo(() => {
    const map: Record<string, Milestone> = {}
    milestones.forEach((milestone) => {
      map[milestone.id] = milestone
    })
    return map
  }, [milestones])

  const overallProgress = taskProgress(milestoneTasks)
  const clientProgress = progressValue(summary.clientPaid, summary.totalDeal)
  const freelancerProgress = progressValue(summary.freelancerPaid, summary.internalCost)
  const projectDeadlineState =
    project?.status === 'done'
      ? { label: 'Selesai', tone: 'neutral' as const }
      : deadlineState(project?.deadline_at)

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading project...
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-950">Project tidak bisa dimuat</h1>
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
              onClick={() => router.push('/')}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl rounded-lg border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-950">Project tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">
            Project ini tidak tersedia untuk akun yang sedang login.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-4 rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="mb-3 text-sm font-medium text-slate-500 transition hover:text-slate-950"
              >
                ← Dashboard
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">
                  {project.name}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                    project.status
                  )}`}
                >
                  {statusLabel(project.status)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${projectTypeClass(
                    project.project_type
                  )}`}
                >
                  {projectTypeLabel(project.project_type)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${projectPriorityClass(
                    project.priority
                  )}`}
                >
                  Prioritas {projectPriorityLabel(project.priority)}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">Client: {project.client}</p>
              {project.deadline_at && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-slate-600">
                    Deadline {formatDateTime(project.deadline_at)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      projectDeadlineState.tone === 'danger'
                        ? 'bg-red-50 text-red-700'
                        : projectDeadlineState.tone === 'warning'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {projectDeadlineState.label}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {canManageProject && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentError('')
                      setPayType('client')
                      setActiveModal('payment')
                    }}
                    className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Tambah Payment
                  </button>
                  <button
                    type="button"
                    onClick={openNewChangeRequest}
                    className="rounded border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
                  >
                    Change Request
                  </button>
                </>
              )}

              {canManageWork && (
                <button
                  type="button"
                  onClick={openNewMilestone}
                  className="rounded border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                >
                  Tambah Milestone
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setUpdateError('')
                  setActiveModal('update')
                }}
                className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Tambah Update
              </button>
            </div>
          </div>
        </header>

        {notice && (
          <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
            {notice}
          </div>
        )}

        {project.status !== 'done' &&
          (projectDeadlineState.tone === 'danger' || projectDeadlineState.tone === 'warning') && (
            <div
              className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 ${
                projectDeadlineState.tone === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <span className="mt-0.5 text-base" aria-hidden="true">
                !
              </span>
              <div>
                <p className="text-sm font-semibold">Perhatian deadline project</p>
                <p className="mt-0.5 text-sm">
                  {projectDeadlineState.label}. Periksa milestone dan task yang belum selesai.
                </p>
              </div>
            </div>
          )}

        <section
          className={`mb-6 grid gap-3 sm:grid-cols-2 ${
            canManageProject ? 'lg:grid-cols-6' : 'lg:grid-cols-3'
          }`}
        >
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              {canManageProject ? 'Deal' : 'Nilai Pekerjaan'}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              Rp {formatRupiah(canManageProject ? summary.totalDeal : summary.internalCost)}
            </p>
            {canManageProject && (
              <p className="mt-1 text-xs text-slate-500">
                Base Rp {formatRupiah(summary.baseDeal)}
              </p>
            )}
          </div>

          {canManageProject && (
            <>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Tambahan Scope</p>
                <p className="mt-2 text-xl font-semibold text-violet-600">
                  Rp {formatRupiah(summary.additionalDeal)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {changeRequests.filter((item) => item.status !== 'pending').length} request aktif
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Fee Freelancer</p>
                <p className="mt-2 text-xl font-semibold text-slate-950">
                  Rp {formatRupiah(summary.internalCost)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {hasFreelancer
                    ? `Base Rp ${formatRupiah(summary.baseCost)}`
                    : 'Dikerjakan sendiri, fee Rp 0'}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Profit</p>
                <p className="mt-2 text-xl font-semibold text-emerald-600">
                  Rp {formatRupiah(summary.profit)}
                </p>
              </div>
            </>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Progress Task</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {Math.round(overallProgress.percentage)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {overallProgress.completed} dari {overallProgress.total} task
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Status Bayar</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {canManageProject
                ? summary.clientDone && summary.freelancerDone
                  ? 'Lunas'
                  : 'Berjalan'
                : summary.freelancerDone
                  ? 'Lunas'
                  : 'Berjalan'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {visiblePayments.length} transaksi terlihat
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Progress Project</h2>
              <p className="text-sm text-slate-500">
                Dihitung otomatis dari seluruh checklist milestone
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-950">
              {overallProgress.completed}/{overallProgress.total} task
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${overallProgress.percentage}%` }}
            />
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-slate-950">Change Request</h2>
                {changeRequests.some((item) => item.status === 'pending') && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {changeRequests.filter((item) => item.status === 'pending').length} menunggu
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Catat tambahan scope, biaya, deadline, dan hubungkan ke milestone
              </p>
            </div>
            {canManageProject && (
              <button
                type="button"
                onClick={openNewChangeRequest}
                className="rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                + Change Request
              </button>
            )}
          </div>

          {changeRequests.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-semibold text-slate-800">Belum ada tambahan scope</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Saat client meminta fitur baru, simpan di sini agar nilai project, profit, dan
                timeline tidak tercampur dengan deal awal.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:p-5">
              {changeRequests.map((changeRequest) => {
                const relatedMilestone = changeRequest.milestone_id
                  ? milestoneById[changeRequest.milestone_id]
                  : null
                const due = deadlineState(changeRequest.deadline_at)
                const isActive = changeRequest.status !== 'pending'

                return (
                  <article
                    key={changeRequest.id}
                    className={`rounded-xl border p-4 ${
                      changeRequest.status === 'pending'
                        ? 'border-amber-200 bg-amber-50/50'
                        : 'border-slate-200 bg-slate-50/70'
                    }`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950">{changeRequest.title}</h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${changeRequestStatusClass(
                              changeRequest.status
                            )}`}
                          >
                            {changeRequestStatusLabel(changeRequest.status)}
                          </span>
                          {!isActive && canManageProject && (
                            <span className="text-xs font-medium text-amber-700">
                              Belum masuk nilai project
                            </span>
                          )}
                        </div>

                        {changeRequest.description && (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {changeRequest.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                          {relatedMilestone && (
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">
                              Milestone: {relatedMilestone.title}
                            </span>
                          )}
                          {changeRequest.deadline_at && (
                            <>
                              <span>Deadline {formatDateTime(changeRequest.deadline_at)}</span>
                              <span
                                className={`rounded-full px-2 py-1 font-semibold ${
                                  due.tone === 'danger'
                                    ? 'bg-red-50 text-red-700'
                                    : due.tone === 'warning'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-white text-slate-600'
                                }`}
                              >
                                {due.label}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[390px]">
                        {canManageProject && (
                          <>
                            <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
                              <p className="text-[11px] font-medium text-slate-500">
                                Tambahan Deal
                              </p>
                              <p className="mt-1 text-sm font-semibold text-violet-700">
                                Rp {formatRupiah(Number(changeRequest.additional_deal || 0))}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
                              <p className="text-[11px] font-medium text-slate-500">
                                Tambahan Fee
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-800">
                                Rp {formatRupiah(Number(changeRequest.additional_cost || 0))}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
                              <p className="text-[11px] font-medium text-slate-500">
                                Tambahan Profit
                              </p>
                              <p className="mt-1 text-sm font-semibold text-emerald-700">
                                Rp{' '}
                                {formatRupiah(
                                  Number(changeRequest.additional_deal || 0) -
                                    Number(changeRequest.additional_cost || 0)
                                )}
                              </p>
                            </div>
                          </>
                        )}
                        {!canManageProject && (
                          <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
                            <p className="text-[11px] font-medium text-slate-500">Tambahan Fee</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              Rp {formatRupiah(Number(changeRequest.additional_cost || 0))}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {canManageProject && (
                      <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <select
                          value={changeRequest.status}
                          disabled={busyChangeId === changeRequest.id}
                          onChange={(event) =>
                            updateChangeRequestStatus(
                              changeRequest,
                              event.target.value as ChangeRequestStatus
                            )
                          }
                          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none transition focus:border-slate-950"
                          aria-label={`Status ${changeRequest.title}`}
                        >
                          {changeRequestStatusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditChangeRequest(changeRequest)}
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingChange(changeRequest)}
                            className="rounded border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Milestone & Task</h2>
              <p className="text-sm text-slate-500">
                Pecah scope awal dan permintaan tambahan tanpa membuat project baru
              </p>
            </div>
            {canManageWork && (
              <button
                type="button"
                onClick={openNewMilestone}
                className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                + Milestone
              </button>
            )}
          </div>

          {milestones.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="font-semibold text-slate-800">Belum ada milestone</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                Mulai dari scope pertama, lalu buat milestone baru saat client menambah fitur agar
                perubahan tetap tercatat rapi.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:p-5">
              {milestones.map((milestone, index) => {
                const tasks = tasksByMilestone[milestone.id] || []
                const progress = taskProgress(tasks)
                const due = deadlineState(milestone.deadline_at)

                return (
                  <article
                    key={milestone.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">
                            M{index + 1}
                          </span>
                          <h3 className="font-semibold text-slate-950">{milestone.title}</h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${milestoneStatusClass(
                              milestone.status
                            )}`}
                          >
                            {milestoneStatusLabel(milestone.status)}
                          </span>
                        </div>
                        {milestone.description && (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {milestone.description}
                          </p>
                        )}
                        {milestone.deadline_at && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-500">
                              Deadline {formatDateTime(milestone.deadline_at)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-1 font-semibold ${
                                due.tone === 'danger'
                                  ? 'bg-red-50 text-red-700'
                                  : due.tone === 'warning'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-white text-slate-600'
                              }`}
                            >
                              {due.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {canManageWork && (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={milestone.status}
                            disabled={busyMilestoneId === milestone.id}
                            onChange={(event) =>
                              updateMilestoneStatus(
                                milestone.id,
                                event.target.value as MilestoneStatus
                              )
                            }
                            className="rounded border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold outline-none transition focus:border-slate-950"
                            aria-label={`Status ${milestone.title}`}
                          >
                            {milestoneStatusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => openEditMilestone(milestone)}
                            className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingMilestone(milestone)}
                            className="rounded border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-600">Progress milestone</span>
                        <span className="font-semibold text-slate-800">
                          {progress.completed}/{progress.total} task ·{' '}
                          {Math.round(progress.percentage)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-sky-500 transition-all"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {tasks.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-slate-500">
                          Belum ada task di milestone ini.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 px-4 py-3 text-sm"
                            >
                              <button
                                type="button"
                                disabled={busyTaskId === task.id || !canManageWork}
                                onClick={() => toggleTask(task)}
                                className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition ${
                                  task.is_completed
                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                    : 'border-slate-300 bg-white hover:border-slate-500'
                                }`}
                                aria-label={
                                  task.is_completed
                                    ? `Tandai ${task.title} belum selesai`
                                    : `Tandai ${task.title} selesai`
                                }
                              >
                                {task.is_completed && (
                                  <svg
                                    viewBox="0 0 20 20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  >
                                    <path d="m4 10 4 4 8-8" strokeLinecap="round" />
                                  </svg>
                                )}
                              </button>
                              <span
                                className={`min-w-0 flex-1 ${
                                  task.is_completed
                                    ? 'text-slate-400 line-through'
                                    : 'text-slate-700'
                                }`}
                              >
                                {task.title}
                              </span>
                              {canManageWork && (
                                <button
                                  type="button"
                                  disabled={busyTaskId === task.id}
                                  onClick={() => deleteTask(task)}
                                  className="text-xs font-semibold text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {canManageWork && (
                        <div className="flex gap-2 border-t border-slate-200 bg-slate-50 p-3">
                          <input
                            value={taskInputs[milestone.id] || ''}
                            onChange={(event) =>
                              setTaskInputs((current) => ({
                                ...current,
                                [milestone.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') addTask(milestone)
                            }}
                            placeholder="Tambah task baru..."
                            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                          />
                          <button
                            type="button"
                            disabled={
                              busyMilestoneId === milestone.id ||
                              !(taskInputs[milestone.id] || '').trim()
                            }
                            onClick={() => addTask(milestone)}
                            className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Tambah
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className={`mb-6 grid gap-4 ${hasFreelancer ? 'lg:grid-cols-2' : ''}`}>
          {canManageProject && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">Pembayaran Client</h2>
                  <p className="text-sm text-slate-500">
                    Rp {formatRupiah(summary.clientPaid)} dari Rp {formatRupiah(summary.totalDeal)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Sisa Rp {formatRupiah(summary.clientRemaining)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${clientProgress}%` }}
                />
              </div>
            </div>
          )}

          {hasFreelancer && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">Pembayaran Freelancer</h2>
                  <p className="text-sm text-slate-500">
                    Rp {formatRupiah(summary.freelancerPaid)} dari Rp{' '}
                    {formatRupiah(summary.internalCost)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Sisa Rp {formatRupiah(summary.freelancerRemaining)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${freelancerProgress}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Riwayat Payment</h2>
              <p className="text-sm text-slate-500">Transaksi terbaru untuk project ini</p>
            </div>

            <div className="divide-y divide-slate-200">
              {visiblePayments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Belum ada payment.</p>
              ) : (
                visiblePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">
                          {paymentTypeLabel(payment.type)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {formatShortDate(payment.date)}
                        </span>
                      </div>
                      {payment.note && <p className="mt-1 text-sm text-slate-500">{payment.note}</p>}
                    </div>

                    <p className="text-base font-semibold text-slate-950">
                      Rp {formatRupiah(Number(payment.amount || 0))}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Timeline</h2>
              <p className="text-sm text-slate-500">Update status dan catatan progress</p>
            </div>

            <div className="divide-y divide-slate-200">
              {updates.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Belum ada update.</p>
              ) : (
                updates.map((update) => {
                  const relatedMilestone = update.milestone_id
                    ? milestoneById[update.milestone_id]
                    : null

                  return (
                    <div key={update.id} className="px-5 py-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                            update.status
                          )}`}
                        >
                          {statusLabel(update.status)}
                        </span>
                        {relatedMilestone && (
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                            {relatedMilestone.title}
                          </span>
                        )}
                        {update.created_at && (
                          <span className="text-xs text-slate-500">
                            {formatShortDate(update.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-6 text-slate-700">{update.note}</p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {activeModal === 'payment' && canManageProject && (
        <Modal title="Tambah Payment" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Jenis payment</span>
              <select
                value={payType}
                onChange={(event) => setPayType(event.target.value as PaymentType)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              >
                <option value="client">Dari Client</option>
                {hasFreelancer && <option value="freelancer">Ke Freelancer</option>}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Nominal</span>
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Max Rp{' '}
                {formatRupiah(
                  payType === 'client' ? summary.clientRemaining : summary.freelancerRemaining
                )}
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tanggal</span>
              <input
                type="date"
                value={payDate}
                onChange={(event) => setPayDate(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Catatan</span>
              <input
                placeholder="Opsional"
                value={payNote}
                onChange={(event) => setPayNote(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            {paymentError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {paymentError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => addPayment()}
                disabled={savingPayment}
                className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPayment ? 'Menyimpan...' : 'Simpan Payment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'update' && (
        <Modal title="Tambah Update" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Catatan update</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={5}
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Milestone terkait
              </span>
              <select
                value={updateMilestoneId}
                onChange={(event) => setUpdateMilestoneId(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              >
                <option value="">Update umum project</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Status project</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              >
                {projectStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {updateError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {updateError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={addUpdate}
                disabled={savingUpdate}
                className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingUpdate ? 'Menyimpan...' : 'Simpan Update'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'change' && canManageProject && (
        <Modal
          title={editingChangeRequest ? 'Edit Change Request' : 'Tambah Change Request'}
          description="Nilai tambahan mulai dihitung ke project setelah statusnya disetujui."
          onClose={closeChangeModal}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Nama tambahan scope
              </span>
              <input
                value={changeTitle}
                onChange={(event) => setChangeTitle(event.target.value)}
                placeholder="Contoh: Tambahan fitur C-G"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Detail permintaan
              </span>
              <textarea
                value={changeDescription}
                onChange={(event) => setChangeDescription(event.target.value)}
                rows={4}
                placeholder="Jelaskan scope, output, dan batasan tambahan"
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
                <select
                  value={changeStatus}
                  onChange={(event) =>
                    setChangeStatus(event.target.value as ChangeRequestStatus)
                  }
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  {changeRequestStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Deadline tambahan
                </span>
                <input
                  type="datetime-local"
                  value={changeDeadline}
                  onChange={(event) => setChangeDeadline(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className={`grid gap-4 ${hasFreelancer ? 'sm:grid-cols-2' : ''}`}>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Tambahan deal client
                </span>
                <input
                  type="number"
                  min="0"
                  value={changeDeal}
                  onChange={(event) => setChangeDeal(event.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                />
              </label>

              {hasFreelancer && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Tambahan fee freelancer
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={changeCost}
                    onChange={(event) => setChangeCost(event.target.value)}
                    placeholder="0"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                  />
                </label>
              )}
            </div>

            {!hasFreelancer && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Project dikerjakan sendiri. Tambahan deal akan menjadi tambahan profit penuh.
              </p>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Tambahan profit</p>
              <p className="mt-1 text-xl font-semibold text-emerald-600">
                Rp{' '}
                {formatRupiah(
                  Number(changeDeal || 0) - (hasFreelancer ? Number(changeCost || 0) : 0)
                )}
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Hubungkan ke milestone
              </span>
              <select
                value={changeMilestoneId}
                onChange={(event) => {
                  setChangeMilestoneId(event.target.value)
                  if (event.target.value) setCreateChangeMilestone(false)
                }}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              >
                <option value="">Belum dihubungkan</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </option>
                ))}
              </select>
            </label>

            {!changeMilestoneId && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
                <input
                  type="checkbox"
                  checked={createChangeMilestone}
                  onChange={(event) => setCreateChangeMilestone(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-semibold text-sky-900">
                    Buat milestone otomatis
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-sky-700">
                    Scope dan deadline change request akan disalin menjadi milestone baru.
                  </span>
                </span>
              </label>
            )}

            {changeError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {changeError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeChangeModal}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveChangeRequest}
                disabled={savingChange}
                className="rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingChange
                  ? 'Menyimpan...'
                  : editingChangeRequest
                    ? 'Update Change Request'
                    : 'Simpan Change Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeModal === 'milestone' && canManageWork && (
        <Modal
          title={editingMilestone ? 'Edit Milestone' : 'Tambah Milestone'}
          description="Gunakan satu milestone untuk satu fase kerja atau tambahan scope client."
          onClose={closeMilestoneModal}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Nama milestone</span>
              <input
                value={milestoneTitle}
                onChange={(event) => setMilestoneTitle(event.target.value)}
                placeholder="Contoh: Scope awal A-B"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Deskripsi scope</span>
              <textarea
                value={milestoneDescription}
                onChange={(event) => setMilestoneDescription(event.target.value)}
                rows={4}
                placeholder="Tujuan, batasan, atau hasil yang diharapkan"
                className="w-full resize-none rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
                <select
                  value={milestoneStatus}
                  onChange={(event) => setMilestoneStatus(event.target.value as MilestoneStatus)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  {milestoneStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Deadline milestone
                </span>
                <input
                  type="datetime-local"
                  value={milestoneDeadline}
                  onChange={(event) => setMilestoneDeadline(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                />
              </label>
            </div>

            {milestoneError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {milestoneError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeMilestoneModal}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveMilestone}
                disabled={savingMilestone}
                className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingMilestone
                  ? 'Menyimpan...'
                  : editingMilestone
                    ? 'Update Milestone'
                    : 'Simpan Milestone'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDuplicatePayment}
        title="Payment tanggal sama?"
        description="Sudah ada payment dengan jenis dan tanggal yang sama. Simpan payment ini tetap?"
        confirmLabel="Tetap Simpan"
        busy={savingPayment}
        onCancel={() => setConfirmDuplicatePayment(false)}
        onConfirm={() => {
          setConfirmDuplicatePayment(false)
          addPayment(true)
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingMilestone)}
        title="Hapus milestone?"
        description={
          deletingMilestone
            ? `Milestone "${deletingMilestone.title}" dan seluruh task di dalamnya akan dihapus.`
            : ''
        }
        confirmLabel="Hapus Milestone"
        variant="danger"
        busy={Boolean(deletingMilestone && busyMilestoneId === deletingMilestone.id)}
        onCancel={() => setDeletingMilestone(null)}
        onConfirm={confirmDeleteMilestone}
      />

      <ConfirmDialog
        open={Boolean(deletingChange)}
        title="Hapus change request?"
        description={
          deletingChange
            ? `Change request "${deletingChange.title}" akan dihapus dari perhitungan project.`
            : ''
        }
        confirmLabel="Hapus Change Request"
        variant="danger"
        busy={Boolean(deletingChange && busyChangeId === deletingChange.id)}
        onCancel={() => setDeletingChange(null)}
        onConfirm={confirmDeleteChangeRequest}
      />
    </main>
  )
}
