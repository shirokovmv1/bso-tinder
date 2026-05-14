interface Props {
  src: string
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  className?: string
}

const sizes = {
  xs: 'w-8 h-8 text-xs',
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-3xl',
}

const dotSizes = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border',
  md: 'w-3 h-3 border-2',
  lg: 'w-4 h-4 border-2',
  xl: 'w-5 h-5 border-2',
}

const isRealPhoto = (url: string) => !!url && !url.includes('dicebear.com')

export default function Avatar({ src, name, size = 'md', online = false, className = '' }: Props) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div className={`${sizes[size]} rounded-full bg-graphite-700 overflow-hidden flex items-center justify-center ring-2 ring-graphite-600`}>
        {isRealPhoto(src) ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="font-display font-bold text-orange-500">{initials}</span>
        )}
      </div>
      {online && (
        <span className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full bg-green-400 border-graphite-900`} />
      )}
    </div>
  )
}
