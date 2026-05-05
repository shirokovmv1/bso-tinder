import { motion } from 'framer-motion'
import type { HobbyTag } from '@/data/types'
import Tag from '@/components/ui/Tag'

interface Props {
  hobbies: HobbyTag[]
  selected: HobbyTag[]
  onToggle: (hobby: HobbyTag) => void
}

export default function HobbyCloud({ hobbies, selected, onToggle }: Props) {
  const selectedIds = new Set(selected.map(h => h.id))

  return (
    <div className="flex flex-wrap gap-2.5 justify-center">
      {hobbies.map((hobby, i) => {
        const isSelected = selectedIds.has(hobby.id)
        return (
          <motion.div
            key={hobby.id}
            custom={i}
            animate={{ y: [0, -6, 0] }}
            transition={{
              delay: (i % 8) * 0.15,
              duration: 2.5 + (i % 4) * 0.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={isSelected ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.25 }}
            >
              <Tag hobby={hobby} selected={isSelected} onClick={() => onToggle(hobby)} />
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}
