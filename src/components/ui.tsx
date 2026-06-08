import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'icon'
}

export function buttonVariants({
  className,
  variant = 'default',
  size = 'md',
}: {
  className?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50',
    variant === 'default' && 'bg-slate-950 text-white shadow hover:bg-slate-800',
    variant === 'secondary' && 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    variant === 'outline' && 'border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50',
    variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
    variant === 'destructive' && 'bg-red-600 text-white shadow hover:bg-red-700',
    size === 'sm' && 'h-9 px-3',
    size === 'md' && 'h-10 px-4 py-2',
    size === 'icon' && 'h-10 w-10',
    className
  )
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonVariants({ className, variant, size })}
      {...props}
    />
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold leading-none tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info'
}

export function Badge({ className, variant = 'secondary', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        variant === 'default' && 'bg-slate-950 text-white ring-slate-950',
        variant === 'secondary' && 'bg-slate-100 text-slate-700 ring-slate-200',
        variant === 'outline' && 'bg-white text-slate-700 ring-slate-200',
        variant === 'success' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        variant === 'warning' && 'bg-amber-50 text-amber-700 ring-amber-200',
        variant === 'danger' && 'bg-red-50 text-red-700 ring-red-200',
        variant === 'info' && 'bg-sky-50 text-sky-700 ring-sky-200',
        className
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function Tabs({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('inline-flex items-center rounded-lg bg-slate-100 p-1 text-slate-500', className)}
      {...props}
    />
  )
}

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

export function TabButton({ className, active, ...props }: TabButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-white text-slate-950 shadow-sm' : 'hover:text-slate-950',
        className
      )}
      {...props}
    />
  )
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className="h-full rounded-full bg-slate-950 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center', className)}>
      <p className="font-semibold text-slate-900">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
    </div>
  )
}
