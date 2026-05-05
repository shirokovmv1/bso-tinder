import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface Props {
  score: number
  size?: number
}

export default function CompatibilityMeter({ score, size = 160 }: Props) {
  const count = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDash = useTransform(count, v => {
    const pct = v / 100
    return `${pct * circumference} ${circumference}`
  })

  useEffect(() => {
    const controls = animate(count, score, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: v => setDisplay(Math.round(v)),
    })
    return controls.stop
  }, [score, count])

  const color = score >= 70 ? '#FF6B00' : score >= 40 ? '#F39C12' : '#6A6A6A'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Трек */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#2D2D2D" strokeWidth="10"
        />
        {/* Прогресс */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={strokeDash}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-white" style={{ fontSize: size * 0.22 }}>
          {display}%
        </span>
        <span className="text-graphite-300 font-body" style={{ fontSize: size * 0.09 }}>
          совместимость
        </span>
      </div>
    </div>
  )
}
