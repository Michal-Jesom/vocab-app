import Dexie, { type Table } from 'dexie'

export interface Vocabulary {
  id?: number
  word: string
  phonetic: string
  definition: string
  createdAt: Date
  source: string
}

export type LearningStage = 'new' | 'learning' | 'review' | 'mastered'

export interface LearningState {
  id?: number
  vocabId: number
  stage: LearningStage
  easeFactor: number
  interval: number
  repetitions: number
  nextReviewDate: Date
  lastReviewDate: Date
  lastQuality: number
  createdAt: Date
  updatedAt: Date
}

export interface StudyLog {
  id?: number
  vocabId: number
  date: Date
  mode: 'learn' | 'review'
  correct: boolean
  responseTime: number
  quality: number
}

export interface UserSettings {
  key: string
  value: number
}

export interface CheckIn {
  id?: number
  date: string
  createdAt: Date
}

class VocabDatabase extends Dexie {
  vocabulary!: Table<Vocabulary, number>
  learningState!: Table<LearningState, number>
  studyLog!: Table<StudyLog, number>
  settings!: Table<UserSettings, string>
  checkins!: Table<CheckIn, number>

  constructor() {
    super('VocabAppDB')
    this.version(1).stores({
      vocabulary: '++id, word, createdAt',
      learningState: '++id, vocabId, stage, nextReviewDate',
      studyLog: '++id, vocabId, date, mode',
    })
    this.version(2).stores({
      vocabulary: '++id, word, createdAt',
      learningState: '++id, vocabId, stage, nextReviewDate',
      studyLog: '++id, vocabId, date, mode',
      settings: '&key',
    })
    this.version(3).stores({
      vocabulary: '++id, word, createdAt',
      learningState: '++id, vocabId, stage, nextReviewDate',
      studyLog: '++id, vocabId, date, mode',
      settings: '&key',
      checkins: '++id, &date',
    })
  }
}

export const db = new VocabDatabase()
