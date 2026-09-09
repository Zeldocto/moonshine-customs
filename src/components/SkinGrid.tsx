import { SkinCard } from './SkinCard'
import { GridSkeleton, EmptyState } from './Loaders'
import type { SkinRecord } from '../types/skin'
import type { ReactNode } from 'react'

interface SkinGridProps {
  skins: SkinRecord[]
  loading?: boolean
  emptyTitle?: string
  emptyBody?: ReactNode
  skeletonCount?: number
}

export function SkinGrid({
  skins,
  loading,
  emptyTitle = 'No skins here yet',
  emptyBody,
  skeletonCount = 8,
}: SkinGridProps) {
  if (loading) return <GridSkeleton count={skeletonCount} />
  if (skins.length === 0) return <EmptyState title={emptyTitle}>{emptyBody}</EmptyState>

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {skins.map((skin) => (
        <SkinCard key={skin.id} skin={skin} />
      ))}
    </div>
  )
}
