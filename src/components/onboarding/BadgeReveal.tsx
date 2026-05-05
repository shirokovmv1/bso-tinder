import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Badge } from '@/data/types'

interface Props {
  badge: Badge
  onContinue: () => void
}

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 340,
    y: -(Math.random() * 260 + 60),
    rotate: Math.random() * 720,
    color: ['#FF6B00', '#FF8C2E', '#FFD700', '#FF4757', '#2ED573', '#1E90FF'][i % 6],
    size: Math.random() * 8 + 6,
    shape: i % 3,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{ width: p.size, height: p.size * (p.shape === 2 ? 0.4 : 1), backgroundColor: p.color, borderRadius: p.shape === 1 ? '50%' : 2 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 0.3 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: Math.random() * 0.2 }}
        />
      ))}
    </div>
  )
}

export default function BadgeReveal({ badge, onContinue }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFlipped(true), 400)
    const t2 = setTimeout(() => setShowConfetti(true), 900)
    const t3 = setTimeout(() => setShowConfetti(false), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative" style={{ perspective: 600 }}>
        <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative w-52 h-52"
        >
          {/* Рубашка */}
          <div
            className="absolute inset-0 rounded-[24px] bg-graphite-700 border-2 border-orange-500/40 flex items-center justify-center"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-6xl">🎁</span>
          </div>

          {/* Лицо */}
          <div
            className="absolute inset-0 rounded-[24px] flex flex-col items-center justify-center gap-3"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              backgroundColor: `${badge.color}22`,
              border: `2px solid ${badge.color}66`,
              boxShadow: `0 0 40px ${badge.color}44`,
            }}
          >
            <span className="text-7xl">{badge.emoji}</span>
            <span className="font-display font-bold text-white text-lg text-center px-4">{badge.title}</span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 text-center px-6"
          >
            <p className="text-graphite-300 font-body text-sm">{badge.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={onContinue}
        className="w-full max-w-xs h-14 bg-orange-500 text-white font-display font-semibold text-lg rounded-[999px]
          shadow-[0_4px_20px_rgba(255,107,0,0.4)] active:scale-95 transition-transform"
      >
        Погнали в ленту! 🚀
      </motion.button>
    </div>
  )
}
