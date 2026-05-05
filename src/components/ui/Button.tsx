import { type ButtonHTMLAttributes, type ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

const base = 'inline-flex items-center justify-center font-display font-semibold transition-all duration-200 select-none rounded-[999px] active:scale-95 disabled:opacity-40 disabled:pointer-events-none'

const variants = {
  primary:   'bg-orange-500 text-white hover:bg-orange-400 shadow-[0_4px_20px_rgba(255,107,0,0.4)]',
  secondary: 'border border-graphite-500 text-white hover:border-orange-500 hover:text-orange-500 bg-transparent',
  ghost:     'text-graphite-300 hover:text-white bg-transparent',
}

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-12 px-6 text-base',
  lg: 'h-14 px-8 text-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: Props) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : children}
    </button>
  )
}
