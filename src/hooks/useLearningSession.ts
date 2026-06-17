import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'
import { calculateSM2 } from '../engine/sm2'
import { generateDailyPlan } from '../engine/planner'

interface LearningWord {
  vocabId: number
  word: string
  phonetic: string
  definition: string
}

interface SessionResult {
  total: number
  rated5: number
  rated4: number
  rated3: number
  rated2: number
  rated1: number
}

export function useLearningSession() {
  const [words, setWords] = useState<LearningWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [results, setResults] = useState<SessionResult>({ total: 0, rated5: 0, rated4: 0, rated3: 0, rated2: 0, rated1: 0 })

  useEffect(() => {
    const load = async () => {
      const plan = await generateDailyPlan()
      setWords(plan.newWords)
      setLoading(false)
    }
    load()
  }, [])

  const rateWord = useCallback(async (quality: number) => {
    const word = words[currentIndex]
    if (!word) return

    const state = await db.learningState.where('vocabId').equals(word.vocabId).first()
    if (!state) return

    const now = new Date()
    const next = calculateSM2(
      { repetitions: state.repetitions, easeFactor: state.easeFactor, interval: state.interval },
      quality
    )

    await db.learningState.update(state.id!, {
      stage: next.stage,
      easeFactor: next.easeFactor,
      interval: next.interval,
      repetitions: next.repetitions,
      lastQuality: quality,
      lastReviewDate: now,
      nextReviewDate: new Date(now.getTime() + next.interval * 86400000),
      updatedAt: now,
    })

    await db.studyLog.add({
      vocabId: word.vocabId,
      date: now,
      mode: 'learn',
      correct: quality >= 3,
      responseTime: 0,
      quality,
    })

    setResults(prev => ({
      total: prev.total + 1,
      rated5: prev.rated5 + (quality === 5 ? 1 : 0),
      rated4: prev.rated4 + (quality === 4 ? 1 : 0),
      rated3: prev.rated3 + (quality === 3 ? 1 : 0),
      rated2: prev.rated2 + (quality === 2 ? 1 : 0),
      rated1: prev.rated1 + (quality === 1 ? 1 : 0),
    }))

    if (currentIndex + 1 >= words.length) {
      setFinished(true)
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, words])

  return { words, currentIndex, currentWord: words[currentIndex] ?? null, loading, finished, results, rateWord }
}
