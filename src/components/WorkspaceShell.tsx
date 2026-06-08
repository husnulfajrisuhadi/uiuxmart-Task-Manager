'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { Badge, Button, Icon, IconTile, Input, type IconName } from '@/components/ui'
import { cn } from '@/lib/cn'

type NavItem = {
  href: string
  label: string
  icon: IconName
  group: 'Command Center' | 'Delivery' | 'Finance' | 'People' | 'System'
  description: string
}

export const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: 'layout',
    group: 'Command Center',
    description: 'Overview bisnis',
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: 'briefcase',
    group: 'Command Center',
    description: 'Deal dan project',
  },
  {
    href: '/deadlines',
    label: 'Deadlines',
    icon: 'calendar',
    group: 'Delivery',
    description: 'Kalender kerja',
  },
  {
    href: '/scopes',
    label: 'Tambahan Scope',
    icon: 'plus',
    group: 'Delivery',
    description: 'Fitur/revisi berbayar',
  },
  {
    href: '/cashflow',
    label: 'Cashflow',
    icon: 'circle-dollar',
    group: 'Finance',
    description: 'Revenue dan fee',
  },
  {
    href: '/team',
    label: 'Tim & Fee',
    icon: 'team',
    group: 'People',
    description: 'Role freelancer',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: 'settings',
    group: 'System',
    description: 'Brand dan akun',
  },
]

const groupOrder: NavItem['group'][] = [
  'Command Center',
  'Delivery',
  'Finance',
  'People',
  'System',
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

  const groupedItems = navItems.reduce<Record<NavItem['group'], NavItem[]>>(
    (groups, item) => {
      groups[item.group] ||= []
      groups[item.group].push(item)
      return groups
    },
    {} as Record<NavItem['group'], NavItem[]>
  )

  return (
    <main className="min-h-screen bg-[#e7eaee] p-0 text-slate-950 lg:p-3">
      <div
        className={cn(
          'mx-auto grid min-h-screen overflow-hidden border border-slate-200/80 bg-[#fbfbfa] shadow-2xl shadow-slate-900/10 transition-[grid-template-columns] duration-300 ease-out lg:min-h-[calc(100vh-1.5rem)] lg:rounded-[28px]',
          collapsed ? 'lg:grid-cols-[78px_minmax(0,1fr)]' : 'lg:grid-cols-[292px_minmax(0,1fr)]'
        )}
      >
        <aside className="hidden border-r border-slate-200/80 bg-white/90 backdrop-blur lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-1.5rem)] lg:flex-col">
          <div className="flex h-[72px] items-center justify-between border-b border-slate-200/80 px-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <IconTile className="h-10 w-10 rounded-2xl">u</IconTile>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-base font-bold tracking-tight text-slate-950">
                    uiuxmart
                  </p>
                  <p className="truncate text-xs font-medium text-slate-500">business workspace</p>
                </div>
              )}
            </Link>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Perbesar sidebar' : 'Minimize sidebar'}
              className="h-8 w-8 shrink-0 rounded-xl"
            >
              {collapsed ? '›' : '‹'}
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {!collapsed && (
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Workspace
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">Project operations</p>
                  </div>
                  <Badge variant="success" dot>Live</Badge>
                </div>
              </div>
            )}

            {groupOrder.map((group) => {
              const items = groupedItems[group] || []
              if (items.length === 0) return null

              return (
                <div key={group} className="mb-5">
                  {!collapsed && (
                    <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {group}
                    </p>
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
                            'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                            active
                              ? 'bg-slate-950 text-white shadow-sm shadow-slate-950/10'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                            collapsed && 'justify-center px-0'
                          )}
                        >
                          <span
                            className={cn(
                              'grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm transition',
                              active
                                ? 'bg-white/15 text-white'
                                : 'bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-slate-950'
                            )}
                          >
                            <Icon name={item.icon} />
                          </span>
                          {!collapsed && (
                            <span className="min-w-0">
                              <span className="block truncate">{item.label}</span>
                              <span
                                className={cn(
                                  'mt-0.5 block truncate text-xs font-medium',
                                  active ? 'text-white/65' : 'text-slate-400'
                                )}
                              >
                                {item.description}
                              </span>
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-slate-200/80 p-3">
            <div
              className={cn(
                'rounded-2xl border border-slate-200 bg-slate-50/80 p-3',
                collapsed && 'grid place-items-center p-2'
              )}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-sm font-semibold text-white">
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

        <section className="min-w-0 bg-[#fbfbfa]">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#fbfbfa]/90 backdrop-blur-xl lg:top-3">
            <div className="flex min-h-[72px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="flex items-center gap-3 lg:hidden">
                <IconTile className="h-10 w-10 rounded-2xl">u</IconTile>
                <div>
                  <p className="text-base font-bold text-slate-950">uiuxmart</p>
                  <p className="text-xs font-medium text-slate-500">workspace</p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span>Main Menu</span>
                    <span>›</span>
                    <span className="text-slate-600">{title}</span>
                  </div>
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                    {title}
                  </h1>
                  {description && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">{description}</p>
                  )}
                </div>

                {onSearchChange && (
                  <div className="relative lg:ml-auto lg:w-[380px]">
                    <Icon
                      name="search"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <Input
                      value={search || ''}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder="Search"
                      className="h-10 rounded-xl bg-white/80 pl-9"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 sm:block">
                      ⌘ K
                    </span>
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

            <nav className="flex gap-2 overflow-x-auto border-t border-slate-200/70 px-4 py-2 lg:hidden">
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
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-950'
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
