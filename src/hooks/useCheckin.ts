import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useCheckin() {
  const [streak, setStreak] = useState(0)
  const [checkedToday, setCheckedToday] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await db.checkins.orderBy('date').reverse().toArray()
    const today = todayKey()
    setCheckedToday(all.length > 0 && all[0].date === today)

    // Calculate consecutive streak
    let s = 0
    const now = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (all.some(c => c.date === key)) {
        s++
      } else if (i > 0) {
        break
      }
    }
    setStreak(s)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const checkin = useCallback(async () => {
    const today = todayKey()
    try {
      const exists = await db.checkins.where('date').equals(today).first()
      if (exists) return
      await db.checkins.add({ date: today, createdAt: new Date() })
      await refresh()
    } catch (err) {
      console.error('Check-in failed:', err)
      await refresh()
    }
  }, [refresh])

  return { streak, checkedToday, loading, checkin }
}
