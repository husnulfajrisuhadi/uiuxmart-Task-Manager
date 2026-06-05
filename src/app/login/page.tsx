'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function resetFeedback() {
    setMessage('')
    setErrorMessage('')
  }

  function switchMode(nextMode: AuthMode) {
    resetFeedback()
    setMode(nextMode)
  }

  async function handleSubmit() {
    resetFeedback()

    if (!email.trim() || !password) {
      setErrorMessage('Email dan password wajib diisi.')
      return
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Nama wajib diisi.')
      return
    }

    if (mode === 'register' && password.length < 6) {
      setErrorMessage('Password minimal 6 karakter.')
      return
    }

    setLoading(true)

    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                name: name.trim(),
              },
            },
          })

    setLoading(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (mode === 'register') {
      if (data.session) {
        router.push('/')
        return
      }

      setMessage('Akun berhasil dibuat. Silakan login dengan akun baru.')
      setMode('login')
      setName('')
      setPassword('')
      return
    }

    router.push('/')
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section className="hidden lg:block">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Task Manager
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight text-slate-950">
              Workspace project dengan akses sesuai pembuat dan assignee.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              Semua user dapat membuat project, menerima assignment, dan mengikuti progres tanpa
              membuka data finansial milik project orang lain.
            </p>

            <div className="mt-10 grid max-w-xl gap-3">
              {[
                ['Project aktif', 'Design sprint', 'Ongoing'],
                ['Cashflow', 'Rp 18,5 jt', 'Terlihat'],
                ['Timeline', 'Review build', 'Update'],
              ].map(([label, value, status]) => (
                <div
                  key={label}
                  className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-white/70 bg-white/80 px-4 py-3 shadow-sm"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase text-emerald-700">
              Task Manager
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              {mode === 'login' ? 'Masuk ke dashboard' : 'Buat akun baru'}
            </h2>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`rounded px-3 py-2 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`rounded px-3 py-2 text-sm font-semibold transition ${
                mode === 'register'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Nama</span>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSubmit()
                }}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-200"
              />
            </label>

            {errorMessage && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {errorMessage}
              </p>
            )}

            {message && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Memproses...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
