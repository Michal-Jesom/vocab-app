import { useState, useEffect, useCallback } from 'react'
import { db } from '../db/database'
import { calculateSM2 } from '../engine/sm2'
import { generateDailyPlan } from '../engine/planner'
import { pickRandom } from '../utils/format'

interface ReviewWord {
  vocabId: number
  learningStateId: number
  word: string
  phonetic: string
  definition: string
  options: string[]
}

interface ReviewResult {
  total: number
  correct: number
  wrong: number
}

export function useReviewSession() {
  const [words, setWords] = useState<ReviewWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finished, setFinished] = useState(false)
  const [results, setResults] = useState<ReviewResult>({ total: 0, correct: 0, wrong: 0 })

  useEffect(() => {
    const load = async () => {
      const plan = await generateDailyPlan()
      const allDefs = await db.vocabulary.toArray()

      const withOptions = plan.reviewWords.map(rw => {
        const correctDef = rw.definition
        const wrongDefs = pickRandom(
          allDefs.map(v => v.definition),
          correctDef,
          3
        )
        const opts = [correctDef, ...wrongDefs].sort(() => Math.random() - 0.5)
        return { ...rw, options: opts }
      })

      setWords(withOptions)
      setLoading(false)
    }
    load()
  }, [])

  const answerWord = useCallback(async (quality: number, responseTime: number) => {
    const word = words[currentIndex]
    if (!word) return

    const state = await db.learningState.get(word.learningStateId)
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
      mode: 'review',
      correct: quality >= 3,
      responseTime,
      quality,
    })

    setResults(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (quality >= 3 ? 1 : 0),
      wrong: prev.wrong + (quality < 3 ? 1 : 0),
    }))

    if (currentIndex + 1 >= words.length) {
      setFinished(true)
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, words])

  return { words, currentIndex, currentWord: words[currentIndex] ?? null, loading, finished, results, answerWord }
}
