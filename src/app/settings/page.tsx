'use client'

import { useRouter } from 'next/navigation'

import { WorkspaceShell } from '@/components/WorkspaceShell'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { useWorkspaceData } from '@/lib/use-workspace-data'

function LoadingState({ label }: { label: string }) {
  return (
    <main className="min-h-screen bg-[#f6f7f8] p-6">
      <Card className="mx-auto max-w-3xl p-6 text-sm text-slate-500">{label}</Card>
    </main>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const workspace = useWorkspaceData()

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (workspace.loading) return <LoadingState label="Loading settings..." />
  if (workspace.loadError) return <LoadingState label={workspace.loadError} />

  return (
    <WorkspaceShell
      title="Settings"
      description="Pengaturan workspace, brand, dan operasional deploy"
      userName={workspace.currentUserName}
      userEmail={workspace.currentUserEmail}
    >
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Brand Workspace</CardTitle>
            <CardDescription>Nama brand dibuat konsisten sesuai catatan utama.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Company name</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">uiuxmart</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ditulis lowercase, menyatu, tanpa spasi, tanpa slash, dan tanpa huruf besar di awal.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <Badge variant="success">Aktif</Badge>
                <p className="mt-3 font-semibold">SaaS shell</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Sidebar route-based dan topbar sticky.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <Badge variant="success">Aktif</Badge>
                <p className="mt-3 font-semibold">Halaman modul</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Dashboard tidak lagi menampung semua fitur.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <Badge variant="info">Siap</Badge>
                <p className="mt-3 font-semibold">Logo</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">Logo bisa dipasang nanti tanpa mengubah struktur UI.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Akun</CardTitle>
            <CardDescription>Session user saat ini</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-950 text-lg font-semibold text-white">
                {(workspace.currentUserName || workspace.currentUserEmail || 'u').slice(0, 1).toLowerCase()}
              </div>
              <p className="mt-4 font-semibold text-slate-950">
                {workspace.currentUserName || workspace.currentUserEmail || 'User'}
              </p>
              {workspace.currentUserEmail && (
                <p className="mt-1 text-sm text-slate-500">{workspace.currentUserEmail}</p>
              )}
              <Button type="button" variant="outline" className="mt-4 w-full" onClick={signOut}>
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Checklist Deploy</CardTitle>
          <CardDescription>Urutan aman ketika push ke GitHub dan Vercel</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="default">1</Badge>
            <p className="mt-3 font-semibold">Jalankan migrasi Supabase</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">SQL di folder supabase harus diterapkan sebelum build production dipakai.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="default">2</Badge>
            <p className="mt-3 font-semibold">Commit dan push</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Vercel akan mengambil perubahan dari GitHub sesuai branch production.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Badge variant="default">3</Badge>
            <p className="mt-3 font-semibold">Cek env Vercel</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">Pastikan URL dan anon key Supabase production sudah sama dengan project aktif.</p>
          </div>
        </CardContent>
      </Card>
    </WorkspaceShell>
  )
}
