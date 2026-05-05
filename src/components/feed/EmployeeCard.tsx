import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Employee } from '@/data/types'
import Avatar from '@/components/ui/Avatar'
import Tag from '@/components/ui/Tag'
import BadgeCard from '@/components/ui/BadgeCard'

interface Props {
  employee: Employee
  selectable?: boolean
  selected?: boolean
  onSelect?: (e: Employee) => void
}

const DEPT_COLORS: Record<string, string> = {
  'IT':        '#2980B9',
  'HR':        '#E91E63',
  'Логистика': '#FF6B00',
  'Стройка':   '#F39C12',
  'Финансы':   '#27AE60',
}

export default function EmployeeCard({ employee, selectable = false, selected = false, onSelect }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visibleHobbies = employee.hobbies.slice(0, 3)
  const extraCount = employee.hobbies.length - 3
  const deptColor = DEPT_COLORS[employee.department] ?? '#FF6B00'

  const handleClick = () => {
    if (selectable) onSelect?.(employee)
    else setExpanded(true)
  }

  return (
    <>
      <motion.div
        layout
        whileTap={{ scale: 0.97 }}
        onClick={handleClick}
        className={`relative bg-graphite-700 rounded-[24px] p-4 cursor-pointer transition-all duration-200 overflow-hidden
          ${selected ? 'ring-2 ring-orange-500 shadow-[0_0_20px_rgba(255,107,0,0.3)]' : 'hover:bg-graphite-600'}`}
      >
        {/* Вспышка при выборе */}
        {selected && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Avatar src={employee.avatar} name={employee.name} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-white text-base leading-tight truncate">{employee.name}</p>
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded-[999px] text-[10px] font-body font-medium text-white"
              style={{ backgroundColor: `${deptColor}33`, color: deptColor, border: `1px solid ${deptColor}55` }}
            >
              {employee.department}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {visibleHobbies.map(h => (
                <Tag key={h.id} hobby={h} size="sm" />
              ))}
              {extraCount > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-[999px] text-xs bg-graphite-600 text-graphite-300">
                  +{extraCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Модал с полной инфой */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full bg-graphite-800 rounded-t-[32px] p-6 pb-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-graphite-600 rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-4 mb-6">
                <Avatar src={employee.avatar} name={employee.name} size="xl" />
                <div>
                  <h2 className="font-display font-bold text-white text-xl">{employee.name}</h2>
                  <span
                    className="inline-block mt-1.5 px-3 py-1 rounded-[999px] text-xs font-medium"
                    style={{ backgroundColor: `${deptColor}22`, color: deptColor, border: `1px solid ${deptColor}44` }}
                  >
                    {employee.department}
                  </span>
                </div>
                <div className="ml-auto">
                  <BadgeCard badge={employee.badge} />
                </div>
              </div>
              <p className="text-graphite-300 text-sm mb-3 font-body">Хобби и интересы</p>
              <div className="flex flex-wrap gap-2">
                {employee.hobbies.map(h => (
                  <Tag key={h.id} hobby={h} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
