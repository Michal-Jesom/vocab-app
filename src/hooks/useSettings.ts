import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'

const DEFAULT_NEW_WORDS = 50
const DEFAULT_REVIEW_LIMIT = 100

export interface LearningSettings {
  dailyNewWords: number
  dailyReviewLimit: number
}

export async function getSettings(): Promise<LearningSettings> {
  const [newWords, reviewLimit] = await Promise.all([
    db.settings.get('dailyNewWords'),
    db.settings.get('dailyReviewLimit'),
  ])
  return {
    dailyNewWords: newWords?.value ?? DEFAULT_NEW_WORDS,
    dailyReviewLimit: reviewLimit?.value ?? DEFAULT_REVIEW_LIMIT,
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<LearningSettings>({
    dailyNewWords: DEFAULT_NEW_WORDS,
    dailyReviewLimit: DEFAULT_REVIEW_LIMIT,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  const updateSettings = useCallback(async (partial: Partial<LearningSettings>) => {
    await db.transaction('rw', db.settings, async () => {
      if (partial.dailyNewWords !== undefined) {
        await db.settings.put({ key: 'dailyNewWords', value: partial.dailyNewWords })
      }
      if (partial.dailyReviewLimit !== undefined) {
        await db.settings.put({ key: 'dailyReviewLimit', value: partial.dailyReviewLimit })
      }
    })
    setSettings(prev => ({ ...prev, ...partial }))
  }, [])

  return { settings, loading, updateSettings }
}
