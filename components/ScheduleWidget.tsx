'use client'

import { useState, useEffect, useRef } from 'react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const STORAGE_KEY = 'schedule-widget'
const DEFAULT_CELLS = ['', '', '', '', '']

export default function ScheduleWidget({ editing }: { editing: boolean }) {
  const [cells, setCells] = useState(DEFAULT_CELLS)
  const prevEditing = useRef(editing)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && (parsed.length === 0 || typeof parsed[0] === 'string')) {
          setCells(parsed)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {}
  }, [])

  // Persist when edit mode closes
  useEffect(() => {
    if (prevEditing.current && !editing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cells))
    }
    prevEditing.current = editing
  }, [editing, cells])

  function updateCell(i: number, value: string) {
    setCells(prev => prev.map((c, ci) => (ci === i ? value : c)))
  }

  return (
    <div className="border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <span className="text-xs text-gray-900 dark:text-gray-100 tracking-wide">Middle Band</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {DAYS.map(d => (
              <th key={d} className="px-2 py-2 text-center font-medium text-gray-600 dark:text-gray-400">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cells.map((cell, i) => (
              <td key={i} className="px-2 py-4 text-center text-gray-700 dark:text-gray-300">
                {editing ? (
                  <input
                    value={cell}
                    onChange={e => updateCell(i, e.target.value)}
                    placeholder="—"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-1 py-1 text-xs text-center text-gray-700 dark:text-gray-200 outline-none focus:border-gray-400 dark:focus:border-gray-600 placeholder-gray-300 dark:placeholder-gray-700"
                  />
                ) : (
                  <span className={cell ? '' : 'text-gray-200 dark:text-gray-700'}>{cell || '—'}</span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
