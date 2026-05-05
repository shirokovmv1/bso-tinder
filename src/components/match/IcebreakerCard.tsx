import { motion } from 'framer-motion'

interface Props {
  text: string
}

export default function IcebreakerCard({ text }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', damping: 20 }}
      className="relative bg-graphite-700 rounded-[20px] p-5 border border-orange-500/30"
      style={{ boxShadow: '0 4px 24px rgba(255,107,0,0.15)' }}
    >
      <svg
        className="absolute -top-3 left-5 text-orange-500"
        width="32" height="24" viewBox="0 0 32 24" fill="currentColor"
      >
        <path d="M0 24V14C0 8.477 3.582 4.21 10.746 1.197L13 5.5C9.5 7 7.5 9.5 7.5 12h5V24H0zm18 0V14c0-5.523 3.582-9.79 10.746-12.803L31 5.5C27.5 7 25.5 9.5 25.5 12h5V24H18z" />
      </svg>
      <p className="font-body text-white text-sm leading-relaxed pt-2">{text}</p>
    </motion.div>
  )
}
