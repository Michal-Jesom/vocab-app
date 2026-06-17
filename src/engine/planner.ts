import { db } from '../db/database'
import { getSettings } from '../hooks/useSettings'

export interface DailyPlan {
  newWords: { vocabId: number; word: string; phonetic: string; definition: string }[]
  reviewWords: { vocabId: number; word: string; phonetic: string; definition: string; learningStateId: number }[]
  newCount: number
  reviewCount: number
}

export async function generateDailyPlan(today: Date = new Date()): Promise<DailyPlan> {
  const settings = await getSettings()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 86400000)

  // New words: stage='new', limited by user setting (default 50)
  const newStates = await db.learningState
    .where('stage')
    .equals('new')
    .limit(settings.dailyNewWords)
    .toArray()

  const newVocabIds = newStates.map(s => s.vocabId)
  const newVocabs = newVocabIds.length > 0
    ? await db.vocabulary.where('id').anyOf(newVocabIds).toArray()
    : []

  const newWordMap = new Map(newVocabs.map(v => [v.id!, v]))
  const newWords = newStates.map(s => {
    const v = newWordMap.get(s.vocabId)!
    return { vocabId: v.id!, word: v.word, phonetic: v.phonetic, definition: v.definition }
  })

  // Review words: nextReviewDate <= today and not already reviewed today
  const reviewStates = await db.learningState
    .where('nextReviewDate')
    .below(endOfToday)
    .filter(s => s.stage !== 'new')
    .toArray()

  const todayLogs = await db.studyLog
    .where('date')
    .between(startOfToday, endOfToday, true, true)
    .toArray()
  const reviewedVocabIds = new Set(todayLogs.filter(l => l.mode === 'review').map(l => l.vocabId))

  const pendingReviews = reviewStates
    .filter(s => !reviewedVocabIds.has(s.vocabId))
    .slice(0, settings.dailyReviewLimit)

  const reviewVocabIds = pendingReviews.map(s => s.vocabId)
  const reviewVocabs = reviewVocabIds.length > 0
    ? await db.vocabulary.where('id').anyOf(reviewVocabIds).toArray()
    : []

  const reviewWordMap = new Map(reviewVocabs.map(v => [v.id!, v]))
  const reviewWords = pendingReviews.map(s => {
    const v = reviewWordMap.get(s.vocabId)!
    return {
      vocabId: v.id!,
      word: v.word,
      phonetic: v.phonetic,
      definition: v.definition,
      learningStateId: s.id!,
    }
  })

  return {
    newWords,
    reviewWords,
    newCount: newWords.length,
    reviewCount: reviewWords.length,
  }
}
