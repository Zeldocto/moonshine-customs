import type { ReactNode } from 'react'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <div className="surface p-6 sm:p-8">
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <p className="mb-6 mt-1 text-inkSoft">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
