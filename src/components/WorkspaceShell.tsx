'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { Button, Input } from '@/components/ui'
import { cn } from '@/lib/cn'

type NavItem = {
  href: string
  label: string
  icon: string
  group?: string
}

export const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '⌘', group: 'General' },
  { href: '/projects', label: 'Projects', icon: '□', group: 'General' },
  { href: '/cashflow', label: 'Cashflow', icon: '↗', group: 'General' },
  { href: '/deadlines', label: 'Deadlines', icon: '◷', group: 'General' },
  { href: '/scopes', label: 'Tambahan Scope', icon: '+', group: 'Workspace' },
  { href: '/team', label: 'Tim & Fee', icon: '◎', group: 'Workspace' },
  { href: '/settings', label: 'Settings', icon: '⚙', group: 'Other' },
]

type WorkspaceShellProps = {
  children: ReactNode
  title: string
  description?: string
  userName?: string
  userEmail?: string
  search?: string
  onSearchChange?: (value: string) => void
  action?: ReactNode
  secondaryAction?: ReactNode
}

export function WorkspaceShell({
  children,
  title,
  description,
  userName,
  userEmail,
  search,
  onSearchChange,
  action,
  secondaryAction,
}: WorkspaceShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const groupedItems = navItems.reduce<Record<string, NavItem[]>>((groups, item) => {
    const group = item.group || 'General'
    groups[group] ||= []
    groups[group].push(item)
    return groups
  }, {})

  return (
    <main className="min-h-screen bg-[#f6f7f8] text-slate-950">
      <div
        className={cn(
          'grid min-h-screen transition-[grid-template-columns] duration-300 ease-out',
          collapsed ? 'lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'
        )}
      >
        <aside className="hidden border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">
                u
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-base font-bold tracking-tight text-slate-950">
                    uiuxmart
                  </p>
                  <p className="truncate text-xs text-slate-500">Nextjs + shadcn/ui</p>
                </div>
              )}
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Perbesar sidebar' : 'Minimize sidebar'}
              className="h-8 w-8 shrink-0"
            >
              {collapsed ? '›' : '‹'}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {Object.entries(groupedItems).map(([group, items]) => (
              <div key={group} className="mb-6">
                {!collapsed && (
                  <p className="mb-2 px-3 text-xs font-medium text-slate-400">{group}</p>
                )}
                <div className="space-y-1">
                  {items.map((item) => {
                    const active = pathname === item.href

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                          active
                            ? 'bg-slate-100 text-slate-950'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                          collapsed && 'justify-center px-0'
                        )}
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center text-sm">
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 p-3">
            <div
              className={cn(
                'rounded-xl border border-slate-200 bg-slate-50 p-3',
                collapsed && 'grid place-items-center p-2'
              )}
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                {(userName || userEmail || 'u').slice(0, 1).toLowerCase()}
              </div>
              {!collapsed && (
                <div className="mt-3 min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {userName || userEmail || 'User'}
                  </p>
                  {userEmail && <p className="truncate text-xs text-slate-500">{userEmail}</p>}
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">
                  u
                </div>
                <div>
                  <p className="text-base font-bold text-slate-950">uiuxmart</p>
                  <p className="text-xs text-slate-500">workspace</p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                    {title}
                  </h1>
                  {description && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">{description}</p>
                  )}
                </div>

                {onSearchChange && (
                  <div className="relative lg:ml-auto lg:w-[360px]">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ⌕
                    </span>
                    <Input
                      value={search || ''}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder="Search"
                      className="h-10 pl-9"
                    />
                  </div>
                )}
              </div>

              {(secondaryAction || action) && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {secondaryAction}
                  {action}
                </div>
              )}
            </div>

            <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
              {navItems.map((item) => {
                const active = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      active
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </header>

          <div className="p-4 lg:p-6">{children}</div>
        </section>
      </div>
    </main>
  )
}
