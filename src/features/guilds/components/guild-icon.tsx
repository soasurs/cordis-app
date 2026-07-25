import { useState } from 'react'

import { resolveGuildIconUrl } from '@/api/assets'

type GuildIconSize = 'rail' | 'header' | 'settings'

const sizeClasses: Record<GuildIconSize, string> = {
  header: 'size-8 text-xs',
  rail: 'size-full text-xs',
  settings: 'size-full text-2xl',
}

function getGuildMark(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return (
    words
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'C'
  )
}

export function GuildIcon({
  className = '',
  guildId,
  iconAssetId,
  name,
  size = 'header',
}: {
  className?: string
  guildId: string
  iconAssetId: string
  name: string
  size?: GuildIconSize
}) {
  const src = resolveGuildIconUrl(guildId, iconAssetId)
  const [failedSrc, setFailedSrc] = useState<string>()
  const showImage = Boolean(src) && failedSrc !== src
  const mark = getGuildMark(name)

  if (!showImage) {
    return (
      <span
        aria-hidden="true"
        className={`grid place-items-center font-bold ${sizeClasses[size]} ${className}`}
      >
        {mark}
      </span>
    )
  }

  return (
    <img
      alt=""
      src={src}
      className={`object-cover ${sizeClasses[size]} ${className}`}
      onError={() => setFailedSrc(src)}
    />
  )
}
