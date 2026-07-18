import type { ReactNode } from 'react'

const TOTEM_AVATARS = {
  f: '/avatars/totem-female.webp',
  m: '/avatars/totem-male.webp',
} as const

export function isRealAvatarUrl(avatarUrl?: string | null) {
  return !!avatarUrl && !avatarUrl.includes('dicebear.com')
}

export function getUserAvatarSrc(avatarUrl?: string | null, gender?: string | null) {
  if (isRealAvatarUrl(avatarUrl)) return avatarUrl as string
  if (gender === 'f' || gender === 'm') return TOTEM_AVATARS[gender]
  return null
}

interface UserAvatarProps {
  avatarUrl?: string | null
  gender?: string | null
  alt: string
  className?: string
  fallback?: ReactNode
}

export default function UserAvatar({ avatarUrl, gender, alt, className = 'h-full w-full object-cover', fallback = null }: UserAvatarProps) {
  const src = getUserAvatarSrc(avatarUrl, gender)

  if (!src) return <>{fallback}</>

  return <img src={src} alt={alt} className={className} />
}
