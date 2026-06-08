'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ConfirmDialog, Modal } from '@/components/Modal'
import { supabase } from '@/lib/supabase'
import {
  type AppUser,
  type ChangeRequest,
  type ChangeRequestStatus,
  type HandoverItem,
  type Milestone,
  type MilestoneStatus,
  type MilestoneTask,
  type Payment,
  type PaymentType,
  type Project,
  type ProjectAssignment,
  type ProjectStatus,
  type ProjectUpdate,
  assignmentExternalFeeTotal,
  changeRequestStatusClass,
  changeRequestStatusLabel,
  changeRequestStatusOptions,
  deadlineState,
  formatDateTime,
  formatRupiah,
  formatShortDate,
  isProjectAssignee,
  isProjectOwner,
  isActiveChangeRequest,
  handoverTemplateItems,
  isAssignmentExternal,
  milestoneStatusClass,
  milestoneStatusLabel,
  milestoneStatusOptions,
  milestoneTemplateGroups,
  paymentTypeLabel,
  progressValue,
  projectAssignmentLabel,
  projectFinancials,
  projectStatusOptions,
  projectTypeClass,
  projectTypeLabel,
  projectTypeLabels,
  projectTypeValues,
  statusClass,
  statusLabel,
  taskProgress,
  toDateTimeLocal,
  userLabel,
  userProjectAssignments,
} from '@/lib/project-utils'

type ModalType =
  | 'payment'
  | 'update'
  | 'milestone'
  | 'change'
  | 'invoice'
  | 'assignments'
  | null

type AssignmentFormRow = {
  id?: string
  projectType: string
  roleLabel: string
  assignedTo: string
  dealAmount: string
  internalFee: string
}

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
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([])
  const [handoverItems, setHandoverItems] = useState<HandoverItem[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
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
  const [payAssignmentId, setPayAssignmentId] = useState('')
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
  const [milestoneAssignmentId, setMilestoneAssignmentId] = useState('')
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
  const [changeAssignmentId, setChangeAssignmentId] = useState('')
  const [createChangeMilestone, setCreateChangeMilestone] = useState(true)
  const [changeError, setChangeError] = useState('')
  const [savingChange, setSavingChange] = useState(false)
  const [deletingChange, setDeletingChange] = useState<ChangeRequest | null>(null)
  const [busyChangeId, setBusyChangeId] = useState('')
  const [assignmentRows, setAssignmentRows] = useState<AssignmentFormRow[]>([])
  const [savingAssignments, setSavingAssignments] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const [newHandoverTitle, setNewHandoverTitle] = useState('')
  const [busyHandoverId, setBusyHandoverId] = useState('')
  const [applyingTemplateId, setApplyingTemplateId] = useState('')
  const [invoiceShareUrl, setInvoiceShareUrl] = useState('')
  const [invoiceLinkError, setInvoiceLinkError] = useState('')
  const [creatingInvoiceLink, setCreatingInvoiceLink] = useState(false)

  const canManageProject = isProjectOwner(project, currentUserId)
  const canManageWork =
    isProjectOwner(project, currentUserId) ||
    isProjectAssignee(project, currentUserId) ||
    projectAssignments.some((assignment) => assignment.assigned_to === currentUserId)

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
      setProjectAssignments([])
      setHandoverItems([])
      setUsers([])
      return
    }

    const [
      usersResult,
      assignmentsResult,
      updatesResult,
      paymentsResult,
      milestonesResult,
      changeRequestsResult,
      handoverResult,
    ] =
      await Promise.all([
      supabase.from('users').select('id,name,email').order('name'),
      supabase
        .from('project_assignments')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true }),
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
      supabase
        .from('handover_items')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (usersResult.error) throw usersResult.error
    if (assignmentsResult.error) throw assignmentsResult.error
    if (updatesResult.error) throw updatesResult.error
    if (paymentsResult.error) throw paymentsResult.error
    if (milestonesResult.error) throw milestonesResult.error
    if (changeRequestsResult.error) throw changeRequestsResult.error
    if (handoverResult.error) throw handoverResult.error

    const milestoneRows = (milestonesResult.data as Milestone[] | null) || []
    const assignmentRowsData = (assignmentsResult.data as ProjectAssignment[] | null) || []
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
    const visibleAssignmentIds = assignmentRowsData
      .filter((assignment) => assignment.assigned_to === userId)
      .map((assignment) => assignment.id)
    const visiblePayments = rawPayments.filter(
      (payment) =>
        isProjectOwner(projectRow, userId) ||
        (payment.type === 'freelancer' &&
          (!payment.assignment_id ||
            visibleAssignmentIds.length === 0 ||
            visibleAssignmentIds.includes(payment.assignment_id)))
    )

    setProject(projectRow)
    setStatus((projectRow.status as ProjectStatus) || 'ongoing')
    setUsers((usersResult.data as AppUser[] | null) || [])
    setProjectAssignments(assignmentRowsData)
    setUpdates((updatesResult.data as ProjectUpdate[] | null) || [])
    setPayments(visiblePayments)
    setMilestones(milestoneRows)
    setMilestoneTasks(taskRows)
    setChangeRequests((changeRequestsResult.data as ChangeRequest[] | null) || [])
    setHandoverItems((handoverResult.data as HandoverItem[] | null) || [])
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

    const relatedMilestone = milestones.find((milestone) => milestone.id === updateMilestoneId)
    const updateAssignmentId =
      relatedMilestone?.assignment_id || (!canManageProject ? myAssignments[0]?.id : null)

    const { error } = await supabase.from('updates').insert({
      project_id: id,
      assignment_id: updateAssignmentId || null,
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
    const financials = projectFinancials(project, changeRequests, projectAssignments)
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
  }, [changeRequests, payments, project, projectAssignments])

  const hasFreelancer = summary.hasExternalAssignee
  const userById = useMemo(() => {
    const map: Record<string, AppUser> = {}
    users.forEach((user) => {
      map[user.id] = user
    })
    return map
  }, [users])
  const currentUser = userById[currentUserId]
  const projectRoleIds = projectAssignments.map((assignment) => assignment.id)
  const myAssignments = useMemo(
    () => userProjectAssignments(projectAssignments, currentUserId),
    [currentUserId, projectAssignments]
  )
  const visibleAssignments = canManageProject ? projectAssignments : myAssignments
  const externalAssignments = projectAssignments.filter((assignment) =>
    isAssignmentExternal(assignment, project)
  )
  const visibleWorkValue = canManageProject
    ? summary.totalDeal
    : myAssignments.length > 0
      ? assignmentExternalFeeTotal(myAssignments, project)
      : summary.internalCost
  const selectedChangeAssignment = projectAssignments.find(
    (assignment) => assignment.id === changeAssignmentId
  )
  const changeHasExternalAssignee = selectedChangeAssignment
    ? isAssignmentExternal(selectedChangeAssignment, project)
    : hasFreelancer

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

    if (payType === 'freelancer' && externalAssignments.length > 0 && !payAssignmentId) {
      setPaymentError('Pilih role/freelancer yang menerima payment.')
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
      assignment_id: payType === 'freelancer' ? payAssignmentId || null : null,
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
    setPayAssignmentId('')
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
    setMilestoneAssignmentId(canManageProject ? projectAssignments[0]?.id || '' : myAssignments[0]?.id || '')
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
    setMilestoneAssignmentId(milestone.assignment_id || '')
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
      assignment_id: milestoneAssignmentId || null,
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
    setChangeAssignmentId(projectAssignments[0]?.id || '')
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
    setChangeAssignmentId(changeRequest.assignment_id || '')
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
      setChangeError('Tambahan scope finansial hanya dapat dikelola pembuat project.')
      return
    }

    const title = changeTitle.trim()
    const additionalDeal = Number(changeDeal || 0)
    const selectedChangeAssignment = projectAssignments.find(
      (assignment) => assignment.id === changeAssignmentId
    )
    const hasChangeExternalAssignee = selectedChangeAssignment
      ? isAssignmentExternal(selectedChangeAssignment, project)
      : hasFreelancer
    const additionalCost = hasChangeExternalAssignee ? Number(changeCost || 0) : 0

    if (!title) {
      setChangeError('Nama tambahan scope wajib diisi.')
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
      setChangeError('Deadline tambahan scope tidak valid.')
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
      assignment_id: changeAssignmentId || null,
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
        editingChangeRequest ? 'Gagal update tambahan scope.' : 'Gagal menambah scope.'
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
          title: `Scope: ${title}`,
          description: changeDescription.trim() || 'Scope tambahan dari client.',
          status: mappedStatus,
          deadline_at: changeDeadline ? new Date(changeDeadline).toISOString() : null,
          assignment_id: changeAssignmentId || null,
          sort_order: milestones.length,
        })
        .select('id')
        .single()

      if (milestoneError) {
        setSavingChange(false)
        console.error(milestoneError)
        closeChangeModal()
        setNotice('Tambahan scope tersimpan, tetapi milestone otomatis gagal dibuat.')
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
        ? 'Tambahan scope berhasil diupdate.'
        : 'Tambahan scope tersimpan dan siap dilacak.'
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
      setNotice('Status tambahan scope gagal diubah.')
      return
    }

    setNotice('Status tambahan scope diperbarui.')
    await fetchAll()
  }

  async function confirmDeleteChangeRequest() {
    if (!deletingChange) return

    setBusyChangeId(deletingChange.id)
    const { error } = await supabase.from('change_requests').delete().eq('id', deletingChange.id)
    setBusyChangeId('')

    if (error) {
      console.error(error)
      setNotice('Tambahan scope gagal dihapus.')
      return
    }

    setDeletingChange(null)
    setNotice('Tambahan scope berhasil dihapus. Milestone terkait tetap disimpan.')
    await fetchAll()
  }

  function openAssignmentsModal() {
    setAssignmentRows(
      projectAssignments.length
        ? projectAssignments.map((assignment) => ({
            id: assignment.id,
            projectType: assignment.project_type,
            roleLabel: assignment.role_label || projectAssignmentLabel(assignment),
            assignedTo: assignment.assigned_to || '',
            dealAmount: String(assignment.deal_amount || ''),
            internalFee: String(assignment.internal_fee || ''),
          }))
        : projectTypeValues(project).map((type) => ({
            projectType: type,
            roleLabel: projectTypeLabel(type),
            assignedTo: project?.assigned_to || currentUserId,
            dealAmount: String(project?.total_deal || ''),
            internalFee:
              project?.assigned_to && project.assigned_to !== project.created_by
                ? String(project.internal_cost || '')
                : '',
          }))
    )
    setAssignmentError('')
    setActiveModal('assignments')
  }

  function addAssignmentRow(projectType = projectTypeValues(project)[0] || 'web_app') {
    setAssignmentRows((rows) => [
      ...rows,
      {
        projectType,
        roleLabel: projectTypeLabel(projectType),
        assignedTo: currentUserId,
        dealAmount: '',
        internalFee: '',
      },
    ])
  }

  function updateAssignmentRow(index: number, patch: Partial<AssignmentFormRow>) {
    setAssignmentRows((rows) =>
      rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        const nextRow = { ...row, ...patch }

        if (patch.projectType) {
          nextRow.roleLabel = projectTypeLabel(patch.projectType)
        }

        if (
          patch.assignedTo !== undefined &&
          (!patch.assignedTo || patch.assignedTo === project?.created_by)
        ) {
          nextRow.internalFee = ''
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

  async function saveAssignments() {
    if (!canManageProject || !project) return

    setAssignmentError('')
    setNotice('')

    const rows = assignmentRows.map((row, index) => {
      const assignedUser = row.assignedTo || project.created_by || currentUserId
      const isExternal = Boolean(assignedUser && assignedUser !== project.created_by)

      return {
        id: row.id,
        project_id: id,
        project_type: row.projectType,
        role_label: row.roleLabel.trim() || projectTypeLabel(row.projectType),
        assigned_to: assignedUser || null,
        deal_amount: Number(row.dealAmount || 0),
        internal_fee: isExternal ? Number(row.internalFee || 0) : 0,
        sort_order: index,
      }
    })

    if (rows.length === 0) {
      setAssignmentError('Minimal satu role wajib dibuat.')
      return
    }

    if (
      rows.some(
        (row) =>
          Number.isNaN(row.deal_amount) ||
          Number.isNaN(row.internal_fee) ||
          row.deal_amount < 0 ||
          row.internal_fee < 0 ||
          row.internal_fee > row.deal_amount
      )
    ) {
      setAssignmentError('Porsi deal dan fee harus valid. Fee tidak boleh melebihi porsi deal.')
      return
    }

    const totalRoleDeal = rows.reduce((total, row) => total + row.deal_amount, 0)
    if (totalRoleDeal > Number(project.total_deal || 0)) {
      setAssignmentError('Total porsi role tidak boleh melebihi deal project.')
      return
    }

    setSavingAssignments(true)

    const keepIds = rows.map((row) => row.id).filter((rowId): rowId is string => Boolean(rowId))
    const deleteIds = projectAssignments
      .map((assignment) => assignment.id)
      .filter((assignmentId) => !keepIds.includes(assignmentId))

    if (deleteIds.length > 0) {
      const { error } = await supabase.from('project_assignments').delete().in('id', deleteIds)
      if (error) {
        setSavingAssignments(false)
        console.error(error)
        setAssignmentError('Role lama gagal dihapus.')
        return
      }
    }

    for (const row of rows) {
      const payload = {
        project_id: id,
        project_type: row.project_type,
        role_label: row.role_label,
        assigned_to: row.assigned_to,
        deal_amount: row.deal_amount,
        internal_fee: row.internal_fee,
        sort_order: row.sort_order,
      }
      const result = row.id
        ? await supabase.from('project_assignments').update(payload).eq('id', row.id)
        : await supabase.from('project_assignments').insert(payload)

      if (result.error) {
        setSavingAssignments(false)
        console.error(result.error)
        setAssignmentError('Pembagian kerja gagal disimpan.')
        return
      }
    }

    const internalCost = rows.reduce((total, row) => total + row.internal_fee, 0)
    const primaryAssignee =
      rows.find((row) => row.assigned_to && row.assigned_to !== project.created_by)?.assigned_to ||
      rows.find((row) => row.assigned_to)?.assigned_to ||
      null
    const { error: projectError } = await supabase
      .from('projects')
      .update({ internal_cost: internalCost, assigned_to: primaryAssignee })
      .eq('id', id)

    setSavingAssignments(false)

    if (projectError) {
      console.error(projectError)
      setAssignmentError('Role tersimpan, tetapi ringkasan project gagal diupdate.')
      await fetchAll()
      return
    }

    setActiveModal(null)
    setNotice('Pembagian kerja dan fee berhasil disimpan.')
    await fetchAll()
  }

  async function applyMilestoneTemplate(
    assignment: ProjectAssignment | null,
    templateId: string
  ) {
    const group = milestoneTemplateGroups.find((item) => item.project_type === templateId)
    if (!group) return

    setApplyingTemplateId(`${assignment?.id || 'project'}-${templateId}`)
    setNotice('')

    let nextSortOrder = milestones.length

    for (const template of group.milestones) {
      const { data: milestoneData, error: milestoneError } = await supabase
        .from('milestones')
        .insert({
          project_id: id,
          assignment_id: assignment?.id || null,
          title: template.title,
          description: template.description,
          status: 'planned',
          sort_order: nextSortOrder,
        })
        .select('id')
        .single()

      if (milestoneError) {
        setApplyingTemplateId('')
        console.error(milestoneError)
        setNotice('Template milestone gagal dibuat.')
        return
      }

      nextSortOrder += 1

      if (template.tasks.length > 0) {
        const { error: tasksError } = await supabase.from('milestone_tasks').insert(
          template.tasks.map((task, index) => ({
            milestone_id: milestoneData.id,
            title: task,
            sort_order: index,
          }))
        )

        if (tasksError) {
          setApplyingTemplateId('')
          console.error(tasksError)
          setNotice('Milestone template dibuat, tetapi task rekomendasi gagal dibuat.')
          await fetchAll()
          return
        }
      }
    }

    setApplyingTemplateId('')
    setNotice('Template milestone berhasil dibuat. Semua item tetap bisa diedit.')
    await fetchAll()
  }

  async function addHandoverItem(title = newHandoverTitle) {
    if (!canManageProject) return

    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const { error } = await supabase.from('handover_items').insert({
      project_id: id,
      title: trimmedTitle,
      sort_order: handoverItems.length,
    })

    if (error) {
      console.error(error)
      setNotice('Checklist handover gagal ditambahkan.')
      return
    }

    setNewHandoverTitle('')
    await fetchAll()
  }

  async function applyHandoverTemplate() {
    if (!canManageProject) return

    const existingTitles = new Set(handoverItems.map((item) => item.title.toLowerCase()))
    const items = handoverTemplateItems
      .filter((title) => !existingTitles.has(title.toLowerCase()))
      .map((title, index) => ({
        project_id: id,
        title,
        sort_order: handoverItems.length + index,
      }))

    if (items.length === 0) {
      setNotice('Checklist handover rekomendasi sudah ada.')
      return
    }

    const { error } = await supabase.from('handover_items').insert(items)
    if (error) {
      console.error(error)
      setNotice('Template handover gagal dibuat.')
      return
    }

    setNotice('Checklist handover rekomendasi berhasil dibuat dan tetap bisa diedit.')
    await fetchAll()
  }

  async function toggleHandoverItem(item: HandoverItem) {
    if (!canManageProject) return

    setBusyHandoverId(item.id)
    const nextCompleted = !item.is_completed
    const { error } = await supabase
      .from('handover_items')
      .update({
        is_completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
      })
      .eq('id', item.id)
    setBusyHandoverId('')

    if (error) {
      console.error(error)
      setNotice('Checklist handover gagal diupdate.')
      return
    }

    await fetchAll()
  }

  async function deleteHandoverItem(item: HandoverItem) {
    if (!canManageProject) return

    setBusyHandoverId(item.id)
    const { error } = await supabase.from('handover_items').delete().eq('id', item.id)
    setBusyHandoverId('')

    if (error) {
      console.error(error)
      setNotice('Checklist handover gagal dihapus.')
      return
    }

    await fetchAll()
  }

  async function createInvoiceLink() {
    if (!canManageProject || !project) return

    setCreatingInvoiceLink(true)
    setInvoiceLinkError('')

    const { data: existingData, error: existingError } = await supabase
      .from('invoice_links')
      .select('token')
      .eq('project_id', id)
      .eq('enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingError) {
      setCreatingInvoiceLink(false)
      console.error(existingError)
      setInvoiceLinkError('Gagal membaca link invoice. Jalankan migrasi Supabase terbaru.')
      return
    }

    let token = existingData?.[0]?.token as string | undefined

    if (!token) {
      token = crypto.randomUUID().replaceAll('-', '')
      const { error: insertError } = await supabase.from('invoice_links').insert({
        project_id: id,
        created_by: currentUserId,
        token,
      })

      if (insertError) {
        setCreatingInvoiceLink(false)
        console.error(insertError)
        setInvoiceLinkError('Gagal membuat link invoice.')
        return
      }
    }

    const url = `${window.location.origin}/invoice/${token}`
    setInvoiceShareUrl(url)

    try {
      await navigator.clipboard.writeText(url)
      setNotice('Link invoice publik berhasil dibuat dan disalin.')
    } catch {
      setNotice('Link invoice publik berhasil dibuat.')
    }

    setCreatingInvoiceLink(false)
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

  const assignmentById = useMemo(() => {
    const map: Record<string, ProjectAssignment> = {}
    projectAssignments.forEach((assignment) => {
      map[assignment.id] = assignment
    })
    return map
  }, [projectAssignments])

  const templateTargets = useMemo(() => {
    const assignments = visibleAssignments.filter((assignment) =>
      milestoneTemplateGroups.some((group) => group.project_type === assignment.project_type)
    )

    if (assignments.length > 0) return assignments

    return projectTypeValues(project).map(
      (type) =>
        ({
          id: `project-${type}`,
          project_id: id,
          project_type: type,
          assigned_to: null,
          role_label: projectTypeLabel(type),
          deal_amount: 0,
          internal_fee: 0,
        }) as ProjectAssignment
    )
  }, [id, project, visibleAssignments])

  const handoverProgress = taskProgress(
    handoverItems.map((item) => ({
      id: item.id,
      milestone_id: item.project_id,
      title: item.title,
      is_completed: item.is_completed,
    }))
  )

  const overallProgress = taskProgress(milestoneTasks)
  const clientProgress = progressValue(summary.clientPaid, summary.totalDeal)
  const freelancerProgress = progressValue(summary.freelancerPaid, summary.internalCost)
  const projectDeadlineState =
    project?.status === 'done'
      ? { label: 'Selesai', tone: 'neutral' as const }
      : deadlineState(project?.deadline_at)
  const activeScopeRequests = useMemo(
    () => changeRequests.filter(isActiveChangeRequest),
    [changeRequests]
  )
  const invoiceLineItems = useMemo(
    () => [
      {
        title: project?.name || 'Project',
        description: `Project awal: ${projectTypeLabels(project).join(', ')}`,
        amount: summary.baseDeal,
      },
      ...activeScopeRequests.map((scope) => ({
        title: scope.title,
        description: scope.description || 'Tambahan scope yang sudah disetujui',
        amount: Number(scope.additional_deal || 0),
      })),
    ],
    [activeScopeRequests, project, summary.baseDeal]
  )
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${
    project?.id.slice(0, 6).toUpperCase() || 'DRAFT'
  }`

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Loading project...
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
        <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
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
    <main className="min-h-screen bg-[#dfe3e6] p-0 text-slate-950 lg:p-6">
      <div className="mx-auto flex min-h-screen max-w-[1720px] overflow-hidden bg-[#f8f8f7] shadow-2xl shadow-slate-500/20 ring-1 ring-slate-200 lg:min-h-[calc(100vh-3rem)] lg:rounded-[28px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-[#f5f5f4] lg:flex lg:flex-col">
          <div className="flex h-[76px] items-center gap-3 border-b border-slate-200 px-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
              u
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-950">uiuxmart</p>
              <p className="text-xs font-medium text-slate-500">project workspace</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-5">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-950 shadow-sm ring-1 ring-slate-200"
            >
              <span>←</span>
              <span>Dashboard</span>
            </button>

            <div className="my-6 border-t border-dashed border-slate-200" />

            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Project Menu
            </p>
            <div className="mt-3 space-y-1">
              {[
                ['Ringkasan', '#ringkasan'],
                ['Tim & Fee', '#tim-fee'],
                ['Tambahan Scope', '#scope'],
                ['Milestone', '#milestone'],
                ['Payment', '#payment'],
                ['Timeline', '#timeline'],
              ].map(([item, href]) => (
                <a
                  key={item}
                  href={href}
                  className="flex w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
                >
                  {item}
                </a>
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-950">
                {currentUser ? userLabel(currentUser) : 'User'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {canManageProject ? 'Owner project' : 'Contributor'}
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-[#fbfbfa]/95 backdrop-blur">
            <div className="flex min-h-[76px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-50"
                  aria-label="Kembali ke dashboard"
                >
                  ←
                </button>
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-slate-400">Main Menu</span>
                    <span className="text-slate-300">›</span>
                    <span className="font-semibold text-slate-950">Project Detail</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{project.client}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canManageProject && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentError('')
                        setPayType('client')
                        setPayAssignmentId(externalAssignments[0]?.id || '')
                        setActiveModal('payment')
                      }}
                      className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveModal('invoice')}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Invoice
                    </button>
                    <button
                      type="button"
                      onClick={openAssignmentsModal}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Tim & Fee
                    </button>
                  </>
                )}
                {canManageWork && (
                  <button
                    type="button"
                    onClick={openNewMilestone}
                    className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                  >
                    Milestone
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUpdateError('')
                    setActiveModal('update')
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Update
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-7">
            <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                      {project.name}
                    </h1>
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
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                    Detail scope, role freelancer, invoice, timeline, dan checklist handover untuk
                    project client {project.client}.
                  </p>
                </div>

                {project.deadline_at && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Deadline
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatDateTime(project.deadline_at)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        projectDeadlineState.tone === 'danger'
                          ? 'bg-red-50 text-red-700'
                          : projectDeadlineState.tone === 'warning'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-white text-slate-600'
                      }`}
                    >
                      {projectDeadlineState.label}
                    </span>
                  </div>
                )}
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
          id="ringkasan"
          className={`mb-6 grid gap-3 sm:grid-cols-2 ${
            canManageProject ? 'lg:grid-cols-6' : 'lg:grid-cols-3'
          }`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              {canManageProject ? 'Deal' : 'Nilai Pekerjaan'}
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              Rp {formatRupiah(canManageProject ? summary.totalDeal : visibleWorkValue)}
            </p>
            {canManageProject && (
              <p className="mt-1 text-xs text-slate-500">
                Base Rp {formatRupiah(summary.baseDeal)}
              </p>
            )}
          </div>

          {canManageProject && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Tambahan Scope</p>
                <p className="mt-2 text-xl font-semibold text-violet-600">
                  Rp {formatRupiah(summary.additionalDeal)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {changeRequests.filter((item) => item.status !== 'pending').length} scope aktif
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Profit</p>
                <p className="mt-2 text-xl font-semibold text-emerald-600">
                  Rp {formatRupiah(summary.profit)}
                </p>
              </div>
            </>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Progress Task</p>
            <p className="mt-2 text-xl font-semibold text-slate-950">
              {Math.round(overallProgress.percentage)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {overallProgress.completed} dari {overallProgress.total} task
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

        <section id="tim-fee" className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Tim & Scope Kerja</h2>
              <p className="text-sm text-slate-500">
                Pembagian nilai, fee, dan area kerja per role dalam project ini
              </p>
            </div>
            {canManageProject && (
              <button
                type="button"
                onClick={openAssignmentsModal}
                className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Edit Tim
              </button>
            )}
          </div>

          {visibleAssignments.length === 0 ? (
            <div className="px-5 py-8 text-sm text-slate-500">
              Belum ada pembagian role. Project lama tetap memakai assignee utama.
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
              {visibleAssignments.map((assignment) => {
                const assignee = assignment.assigned_to ? userById[assignment.assigned_to] : null
                const isExternal = isAssignmentExternal(assignment, project)
                const rolePayments = payments
                  .filter(
                    (payment) =>
                      payment.type === 'freelancer' && payment.assignment_id === assignment.id
                  )
                  .reduce((total, payment) => total + Number(payment.amount || 0), 0)
                const roleFee = isExternal ? Number(assignment.internal_fee || 0) : 0
                const roleRemaining = Math.max(0, roleFee - rolePayments)

                return (
                  <article
                    key={assignment.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${projectTypeClass(
                          assignment.project_type
                        )}`}
                      >
                        {projectTypeLabel(assignment.project_type)}
                      </span>
                      <h3 className="font-semibold text-slate-950">
                        {projectAssignmentLabel(assignment)}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {assignee ? userLabel(assignee) : 'Belum di-assign'}
                      {assignment.assigned_to === project.created_by ? ' · dikerjakan internal' : ''}
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      {canManageProject && (
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-[11px] font-medium text-slate-500">Porsi deal</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            Rp {formatRupiah(Number(assignment.deal_amount || 0))}
                          </p>
                        </div>
                      )}
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[11px] font-medium text-slate-500">
                          {isExternal ? 'Fee role' : 'Fee eksternal'}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          Rp {formatRupiah(roleFee)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-[11px] font-medium text-slate-500">Sisa fee</p>
                        <p className="mt-1 text-sm font-semibold text-amber-700">
                          Rp {formatRupiah(roleRemaining)}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section id="scope" className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-slate-950">Tambahan Scope</h2>
                {changeRequests.some((item) => item.status === 'pending') && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    {changeRequests.filter((item) => item.status === 'pending').length} menunggu
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Catat permintaan tambahan, biaya, deadline, dan hubungkan ke milestone
              </p>
            </div>
            {canManageProject && (
              <button
                type="button"
                onClick={openNewChangeRequest}
                className="rounded bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                + Tambahan Scope
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

        <section id="milestone" className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
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

          {canManageWork && templateTargets.length > 0 && (
            <div className="border-b border-slate-200 bg-sky-50/60 px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-sky-950">
                    Rekomendasi template milestone
                  </p>
                  <p className="mt-1 text-xs leading-5 text-sky-800">
                    Template hanya membuat draft milestone dan task. Setelah dibuat, semua item
                    tetap editable dan tidak terkunci.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {templateTargets.map((assignment) => {
                  const group = milestoneTemplateGroups.find(
                    (item) => item.project_type === assignment.project_type
                  )
                  if (!group) return null

                  const templateKey = `${assignment.id}-${group.project_type}`
                  const assignee = assignment.assigned_to ? userById[assignment.assigned_to] : null

                  return (
                    <div
                      key={templateKey}
                      className="rounded-xl border border-sky-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {group.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {projectAssignmentLabel(assignment)}
                            {assignee ? ` · ${userLabel(assignee)}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={applyingTemplateId === templateKey}
                          onClick={() =>
                            applyMilestoneTemplate(
                              projectRoleIds.includes(assignment.id) ? assignment : null,
                              group.project_type
                            )
                          }
                          className="rounded bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {applyingTemplateId === templateKey ? 'Membuat...' : 'Gunakan'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{group.description}</p>
                      <p className="mt-3 text-xs font-medium text-slate-600">
                        {group.milestones.length} milestone ·{' '}
                        {group.milestones.reduce(
                          (total, milestone) => total + milestone.tasks.length,
                          0
                        )}{' '}
                        task rekomendasi
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
                const assignment = milestone.assignment_id
                  ? assignmentById[milestone.assignment_id]
                  : null

                return (
                  <article
                    key={milestone.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400">
                            M{index + 1}
                          </span>
                          <h3 className="font-semibold text-slate-950">{milestone.title}</h3>
                          {assignment && (
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                              {projectAssignmentLabel(assignment)}
                            </span>
                          )}
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

                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          <div id="payment" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-semibold text-slate-950">Riwayat Payment</h2>
              <p className="text-sm text-slate-500">Transaksi terbaru untuk project ini</p>
            </div>

            <div className="divide-y divide-slate-200">
              {visiblePayments.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Belum ada payment.</p>
              ) : (
                visiblePayments.map((payment) => {
                  const assignment = payment.assignment_id
                    ? assignmentById[payment.assignment_id]
                    : null

                  return (
                    <div
                      key={payment.id}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-950">
                            {paymentTypeLabel(payment.type)}
                          </span>
                          {assignment && (
                            <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                              {projectAssignmentLabel(assignment)}
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {formatShortDate(payment.date)}
                          </span>
                        </div>
                        {payment.note && (
                          <p className="mt-1 text-sm text-slate-500">{payment.note}</p>
                        )}
                      </div>

                      <p className="text-base font-semibold text-slate-950">
                        Rp {formatRupiah(Number(payment.amount || 0))}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div id="timeline" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                  const assignment = update.assignment_id
                    ? assignmentById[update.assignment_id]
                    : relatedMilestone?.assignment_id
                      ? assignmentById[relatedMilestone.assignment_id]
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
                        {assignment && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {projectAssignmentLabel(assignment)}
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

        {canManageProject && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Checklist Handover</h2>
                <p className="text-sm text-slate-500">
                  Pastikan output, akses, dokumentasi, dan masa garansi sudah jelas sebelum project
                  ditutup.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {handoverProgress.completed}/{handoverProgress.total} selesai
              </div>
            </div>

            <div className="p-4 sm:p-5">
              {handoverItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="font-semibold text-slate-800">Belum ada checklist handover</p>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                    Gunakan rekomendasi uiuxmart atau tambahkan checklist sendiri sesuai project.
                  </p>
                  <button
                    type="button"
                    onClick={applyHandoverTemplate}
                    className="mt-4 rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Gunakan Rekomendasi
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="divide-y divide-slate-100">
                    {handoverItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                        <button
                          type="button"
                          disabled={busyHandoverId === item.id}
                          onClick={() => toggleHandoverItem(item)}
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition ${
                            item.is_completed
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 bg-white hover:border-slate-500'
                          }`}
                          aria-label={
                            item.is_completed
                              ? `Tandai ${item.title} belum selesai`
                              : `Tandai ${item.title} selesai`
                          }
                        >
                          {item.is_completed && (
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
                            item.is_completed ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}
                        >
                          {item.title}
                        </span>
                        <button
                          type="button"
                          disabled={busyHandoverId === item.id}
                          onClick={() => deleteHandoverItem(item)}
                          className="text-xs font-semibold text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={newHandoverTitle}
                  onChange={(event) => setNewHandoverTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addHandoverItem()
                  }}
                  placeholder="Tambah checklist handover..."
                  className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                />
                <button
                  type="button"
                  onClick={() => addHandoverItem()}
                  disabled={!newHandoverTitle.trim()}
                  className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tambah
                </button>
                {handoverItems.length > 0 && (
                  <button
                    type="button"
                    onClick={applyHandoverTemplate}
                    className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Tambah Rekomendasi
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
          </div>
        </section>
      </div>

      {activeModal === 'invoice' && canManageProject && (
        <Modal
          title="Generate Invoice"
          description="Invoice dibuat atas nama uiuxmart dan siap dicetak atau disimpan sebagai PDF."
          onClose={() => setActiveModal(null)}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-4">
            <div className="print-invoice overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-6 bg-slate-950 px-6 py-6 text-white sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
                    uiuxmart
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold">Invoice</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                    Digital product, UI/UX, website, aplikasi, dan project service.
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-left sm:text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Nomor Invoice</p>
                  <p className="mt-1 font-semibold">{invoiceNumber}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-300">Tanggal</p>
                  <p className="mt-1 font-semibold">{formatShortDate(new Date().toISOString())}</p>
                </div>
              </div>

              <div className="grid gap-4 border-b border-slate-200 px-6 py-5 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Ditagihkan Kepada
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{project.client}</p>
                  <p className="mt-1 text-sm text-slate-500">{project.name}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Layanan
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {projectTypeLabels(project).join(', ')}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Status {statusLabel(project.status)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Deadline
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatDateTime(project.deadline_at)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Atas nama uiuxmart</p>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[1fr_150px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Deskripsi</span>
                    <span className="text-right">Nominal</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {invoiceLineItems.map((item, index) => (
                      <div
                        key={`${item.title}-${index}`}
                        className="grid grid-cols-[1fr_150px] gap-4 px-4 py-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-950">{item.title}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {item.description}
                          </p>
                        </div>
                        <p className="text-right font-semibold text-slate-950">
                          Rp {formatRupiah(item.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">Catatan Pembayaran</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-800">
                      Invoice ini diterbitkan oleh uiuxmart. Nominal yang sudah diterima dihitung
                      dari riwayat payment client pada project ini.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total invoice</span>
                      <span className="font-semibold text-slate-950">
                        Rp {formatRupiah(summary.totalDeal)}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-between text-sm">
                      <span className="text-slate-500">Sudah dibayar</span>
                      <span className="font-semibold text-emerald-700">
                          Rp {formatRupiah(summary.clientPaid)}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-700">Sisa tagihan</span>
                        <span className="text-xl font-semibold text-slate-950">
                          Rp {formatRupiah(Math.max(0, summary.clientRemaining))}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`mt-4 rounded-full px-3 py-1 text-center text-xs font-semibold ${
                        summary.clientRemaining <= 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {summary.clientRemaining <= 0 ? 'Lunas' : 'Belum lunas'}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4 border-t border-slate-200 pt-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">uiuxmart</p>
                    <p className="mt-1 text-xs text-slate-500">Invoice dibuat otomatis dari sistem.</p>
                  </div>
                  <div className="text-right">
                    <div className="ml-auto h-px w-36 bg-slate-300" />
                    <p className="mt-2 text-xs font-semibold text-slate-500">Authorized</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="no-print flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Cetak / Simpan PDF
              </button>
              <button
                type="button"
                onClick={createInvoiceLink}
                disabled={creatingInvoiceLink}
                className="rounded border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingInvoiceLink ? 'Membuat link...' : 'Buat / Salin Link'}
              </button>
            </div>
            {(invoiceShareUrl || invoiceLinkError) && (
              <div className="no-print rounded-xl border border-slate-200 bg-slate-50 p-3">
                {invoiceShareUrl && (
                  <>
                    <p className="text-xs font-semibold text-slate-500">Link invoice publik</p>
                    <p className="mt-1 break-all text-sm font-medium text-slate-800">
                      {invoiceShareUrl}
                    </p>
                  </>
                )}
                {invoiceLinkError && (
                  <p className="text-sm font-medium text-red-700">{invoiceLinkError}</p>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {activeModal === 'payment' && canManageProject && (
        <Modal title="Tambah Payment" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Jenis payment</span>
              <select
                value={payType}
                onChange={(event) => {
                  const nextType = event.target.value as PaymentType
                  setPayType(nextType)
                  setPayAssignmentId(nextType === 'freelancer' ? externalAssignments[0]?.id || '' : '')
                }}
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              >
                <option value="client">Dari Client</option>
                {hasFreelancer && <option value="freelancer">Ke Freelancer</option>}
              </select>
            </label>

            {payType === 'freelancer' && externalAssignments.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Role penerima
                </span>
                <select
                  value={payAssignmentId}
                  onChange={(event) => setPayAssignmentId(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="">Pilih role</option>
                  {externalAssignments.map((assignment) => {
                    const assignee = assignment.assigned_to ? userById[assignment.assigned_to] : null
                    return (
                      <option key={assignment.id} value={assignment.id}>
                        {projectAssignmentLabel(assignment)}
                        {assignee ? ` - ${userLabel(assignee)}` : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
            )}

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
          title={editingChangeRequest ? 'Edit Tambahan Scope' : 'Tambah Scope'}
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

            {projectAssignments.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Masuk ke role/scope
                </span>
                <select
                  value={changeAssignmentId}
                  onChange={(event) => setChangeAssignmentId(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="">Umum project</option>
                  {projectAssignments.map((assignment) => {
                    const assignee = assignment.assigned_to ? userById[assignment.assigned_to] : null
                    return (
                      <option key={assignment.id} value={assignment.id}>
                        {projectAssignmentLabel(assignment)}
                        {assignee ? ` - ${userLabel(assignee)}` : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
            )}

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

            <div className={`grid gap-4 ${changeHasExternalAssignee ? 'sm:grid-cols-2' : ''}`}>
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

              {changeHasExternalAssignee && (
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

            {!changeHasExternalAssignee && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Scope ini dikerjakan internal/saya. Tambahan deal akan menjadi tambahan profit penuh.
              </p>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">Tambahan profit</p>
              <p className="mt-1 text-xl font-semibold text-emerald-600">
                Rp{' '}
                {formatRupiah(
                  Number(changeDeal || 0) -
                    (changeHasExternalAssignee ? Number(changeCost || 0) : 0)
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
                  const nextMilestoneId = event.target.value
                  setChangeMilestoneId(nextMilestoneId)
                  if (nextMilestoneId) {
                    setCreateChangeMilestone(false)
                    const milestone = milestoneById[nextMilestoneId]
                    if (milestone?.assignment_id) setChangeAssignmentId(milestone.assignment_id)
                  }
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
                    Scope dan deadline akan disalin menjadi milestone baru.
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
                    ? 'Update Scope'
                    : 'Simpan Scope'}
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

            {visibleAssignments.length > 0 && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Role/scope kerja
                </span>
                <select
                  value={milestoneAssignmentId}
                  onChange={(event) => setMilestoneAssignmentId(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                >
                  <option value="">Umum project</option>
                  {visibleAssignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {projectAssignmentLabel(assignment)}
                    </option>
                  ))}
                </select>
              </label>
            )}

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

      {activeModal === 'assignments' && canManageProject && (
        <Modal
          title="Tim & Pembagian Fee"
          description="Atur role kerja, porsi deal, dan fee freelancer. Role yang dikerjakan pembuat project otomatis fee 0."
          onClose={() => setActiveModal(null)}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Pembagian role</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Contoh: Program dikerjakan Ahsin, naskah skripsi dikerjakan Anda. Fee eksternal
                    hanya diisi untuk pelaksana selain pembuat project.
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
                  const isExternal = Boolean(row.assignedTo && row.assignedTo !== project.created_by)

                  return (
                    <div key={`${row.id || row.projectType}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-600">
                            Tipe kerja
                          </span>
                          <select
                            value={row.projectType}
                            onChange={(event) =>
                              updateAssignmentRow(index, { projectType: event.target.value })
                            }
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-950"
                          >
                            {projectTypeValues(project).map((type) => (
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
                                {user.id === project.created_by
                                  ? `${userLabel(user)} (Pembuat)`
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
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Deal project</p>
                <p className="mt-1 font-semibold text-slate-950">
                  Rp {formatRupiah(Number(project.total_deal || 0))}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Total fee eksternal</p>
                <p className="mt-1 font-semibold text-slate-950">
                  Rp{' '}
                  {formatRupiah(
                    assignmentRows.reduce((total, row) => {
                      const isExternal = row.assignedTo && row.assignedTo !== project.created_by
                      return total + (isExternal ? Number(row.internalFee || 0) : 0)
                    }, 0)
                  )}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Estimasi profit</p>
                <p className="mt-1 font-semibold text-emerald-800">
                  Rp{' '}
                  {formatRupiah(
                    Number(project.total_deal || 0) -
                      assignmentRows.reduce((total, row) => {
                        const isExternal = row.assignedTo && row.assignedTo !== project.created_by
                        return total + (isExternal ? Number(row.internalFee || 0) : 0)
                      }, 0)
                  )}
                </p>
              </div>
            </div>

            {assignmentError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {assignmentError}
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
                onClick={saveAssignments}
                disabled={savingAssignments}
                className="rounded bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingAssignments ? 'Menyimpan...' : 'Simpan Pembagian'}
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
        title="Hapus tambahan scope?"
        description={
          deletingChange
            ? `Tambahan scope "${deletingChange.title}" akan dihapus dari perhitungan project.`
            : ''
        }
        confirmLabel="Hapus Scope"
        variant="danger"
        busy={Boolean(deletingChange && busyChangeId === deletingChange.id)}
        onCancel={() => setDeletingChange(null)}
        onConfirm={confirmDeleteChangeRequest}
      />
    </main>
  )
}
