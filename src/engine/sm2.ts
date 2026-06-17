import type { LearningState, LearningStage } from '../db/database'

export interface SM2Input {
  repetitions: number
  easeFactor: number
  interval: number
}

export interface SM2Output {
  repetitions: number
  easeFactor: number
  interval: number
  stage: LearningStage
}

export function createInitialState(vocabId: number): Omit<LearningState, 'id'> {
  const now = new Date()
  return {
    vocabId,
    stage: 'new',
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReviewDate: now,
    lastReviewDate: now,
    lastQuality: 0,
    createdAt: now,
    updatedAt: now,
  }
}

export function calculateSM2(prev: SM2Input, quality: number): SM2Output {
  let { repetitions, easeFactor, interval } = prev

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 3
    } else if (repetitions === 2) {
      interval = 7
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  } else {
    repetitions = 0
    interval = 1
  }

  easeFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  if (easeFactor < 1.3) {
    easeFactor = 1.3
  }

  const stage: LearningStage = repetitions === 0 ? 'learning'
    : repetitions < 3 ? 'review'
    : 'mastered'

  return { repetitions, easeFactor, interval, stage }
}
