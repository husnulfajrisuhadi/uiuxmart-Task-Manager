import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SVGProps,
  SelectHTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react'

import { cn } from '@/lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'soft'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

export type IconName =
  | 'activity'
  | 'arrow-down'
  | 'arrow-up'
  | 'bell'
  | 'briefcase'
  | 'calendar'
  | 'chart'
  | 'chevron-left'
  | 'chevron-right'
  | 'circle-dollar'
  | 'filter'
  | 'layout'
  | 'plus'
  | 'search'
  | 'settings'
  | 'sparkles'
  | 'target'
  | 'team'

const iconPaths: Record<IconName, ReactNode> = {
  activity: (
    <>
      <path d="M22 12h-4l-3 8-6-16-3 8H2" />
    </>
  ),
  'arrow-down': (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  'arrow-up': (
    <>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </>
  ),
  bell: (
    <>
      <path d="M10 5a2 2 0 0 1 4 0" />
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 6 3 8H3c0-2 3-1 3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  briefcase: (
    <>
      <path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" />
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 12h18" />
      <path d="M12 12v2" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 3 3 5-7" />
    </>
  ),
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'circle-dollar': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M15 9.5A3 3 0 0 0 12 8c-1.7 0-3 1-3 2.3 0 3.2 6 1.4 6 4.4 0 1.3-1.3 2.3-3 2.3a3.3 3.3 0 0 1-3-1.5" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M9 9h12" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  settings: (
    <>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2.1 2.1 0 0 1-3 3l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21a2.1 2.1 0 0 1-4.2 0v-.2a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1a2.1 2.1 0 1 1-3-3l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3a2.1 2.1 0 0 1 0-4.2h.2a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2.1 2.1 0 1 1 3-3l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3a2.1 2.1 0 0 1 4.2 0v.2a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2.1 2.1 0 1 1 3 3l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.2a2.1 2.1 0 0 1 0 4.2h-.2a1.8 1.8 0 0 0-1.6 1Z" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
      <path d="m5 3 .8 2.2L8 6l-2.2.8L5 9l-.8-2.2L2 6l2.2-.8L5 3Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  team: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.6" />
      <path d="M16 3.4a4 4 0 0 1 0 7.2" />
    </>
  ),
}

export function Icon({
  name,
  className,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: IconName
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-4 w-4', className)}
      {...props}
    >
      {iconPaths[name]}
    </svg>
  )
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
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-300/70 disabled:pointer-events-none disabled:opacity-50',
    variant === 'default' && 'bg-slate-950 text-white shadow-sm shadow-slate-950/10 hover:bg-slate-800',
    variant === 'secondary' && 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    variant === 'outline' && 'border border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-950/5 hover:bg-slate-50 hover:text-slate-950',
    variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
    variant === 'destructive' && 'bg-red-600 text-white shadow-sm hover:bg-red-700',
    variant === 'soft' && 'bg-white/70 text-slate-700 ring-1 ring-slate-200 hover:bg-white hover:text-slate-950',
    size === 'sm' && 'h-8 rounded-md px-3 text-xs',
    size === 'md' && 'h-9 px-4 py-2',
    size === 'lg' && 'h-10 px-5 py-2',
    size === 'icon' && 'h-9 w-9',
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
        'rounded-2xl border border-slate-200/80 bg-white text-slate-950 shadow-[0_1px_2px_rgb(15_23_42/0.04)]',
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold leading-none tracking-tight text-slate-950', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm leading-5 text-slate-500', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info' | 'violet'
  dot?: boolean
}

export function Badge({ className, variant = 'secondary', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ring-inset',
        variant === 'default' && 'bg-slate-950 text-white ring-slate-950',
        variant === 'secondary' && 'bg-slate-100 text-slate-700 ring-slate-200/80',
        variant === 'outline' && 'bg-white text-slate-700 ring-slate-200',
        variant === 'success' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        variant === 'warning' && 'bg-amber-50 text-amber-700 ring-amber-200',
        variant === 'danger' && 'bg-red-50 text-red-700 ring-red-200',
        variant === 'info' && 'bg-sky-50 text-sky-700 ring-sky-200',
        variant === 'violet' && 'bg-violet-50 text-violet-700 ring-violet-200',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full bg-current',
            variant === 'outline' && 'bg-slate-400'
          )}
        />
      )}
      {children}
    </span>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm shadow-slate-950/5 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-50',
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
        'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm shadow-slate-950/5 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function Tabs({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('inline-flex items-center rounded-xl border border-slate-200 bg-white/70 p-1 text-slate-500 shadow-sm shadow-slate-950/5', className)}
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
        'rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200',
        active ? 'bg-slate-950 text-white shadow-sm' : 'hover:bg-slate-100 hover:text-slate-950',
        className
      )}
      {...props}
    />
  )
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70', className)}>
      <div
        className="h-full rounded-full bg-slate-950 transition-all duration-500"
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
    <div className={cn('rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center', className)}>
      <p className="font-semibold text-slate-900">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
    </div>
  )
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-slate-100 transition-colors hover:bg-slate-50/80 data-[state=selected]:bg-slate-50',
        className
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500',
        className
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-4 align-middle', className)} {...props} />
}

export function IconTile({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white shadow-sm shadow-slate-950/10',
        className
      )}
    >
      {children}
    </span>
  )
}

export function MetricCard({
  label,
  value,
  helper,
  icon,
  tone = 'slate',
}: {
  label: string
  value: ReactNode
  helper?: ReactNode
  icon?: ReactNode
  tone?: 'slate' | 'emerald' | 'amber' | 'sky' | 'violet'
}) {
  const toneClass = {
    slate: 'bg-slate-950 text-white',
    emerald: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white',
    sky: 'bg-sky-600 text-white',
    violet: 'bg-violet-600 text-white',
  }[tone]

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
          </div>
          {icon && <IconTile className={toneClass}>{icon}</IconTile>}
        </div>
      </CardHeader>
      {helper && <CardContent><p className="text-sm leading-5 text-slate-500">{helper}</p></CardContent>}
    </Card>
  )
}
