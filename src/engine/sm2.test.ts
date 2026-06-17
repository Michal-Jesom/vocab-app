import { describe, it, expect } from 'vitest'
import { calculateSM2, createInitialState } from './sm2'

describe('createInitialState', () => {
  it('should create default state for a new vocabulary word', () => {
    const state = createInitialState(1)
    expect(state.vocabId).toBe(1)
    expect(state.stage).toBe('new')
    expect(state.easeFactor).toBe(2.5)
    expect(state.interval).toBe(0)
    expect(state.repetitions).toBe(0)
  })
})

describe('calculateSM2', () => {
  it('quality 0 (forgotten) should reset and schedule tomorrow', () => {
    const result = calculateSM2({ repetitions: 3, easeFactor: 2.5, interval: 7 }, 0)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
  })

  it('quality 1 (forgotten) should reset and schedule tomorrow', () => {
    const result = calculateSM2({ repetitions: 2, easeFactor: 2.5, interval: 3 }, 1)
    expect(result.repetitions).toBe(0)
    expect(result.interval).toBe(1)
  })

  it('quality 3 first time should schedule 1 day later', () => {
    const result = calculateSM2({ repetitions: 0, easeFactor: 2.5, interval: 0 }, 3)
    expect(result.repetitions).toBe(1)
    expect(result.interval).toBe(1)
  })

  it('quality 3 second time should schedule 3 days later', () => {
    const result = calculateSM2({ repetitions: 1, easeFactor: 2.5, interval: 1 }, 3)
    expect(result.repetitions).toBe(2)
    expect(result.interval).toBe(3)
  })

  it('quality 3 third time should schedule 7 days later', () => {
    const result = calculateSM2({ repetitions: 2, easeFactor: 2.5, interval: 3 }, 3)
    expect(result.repetitions).toBe(3)
    expect(result.interval).toBe(7)
  })

  it('quality 4 beyond third review should multiply interval by easeFactor', () => {
    const result = calculateSM2({ repetitions: 3, easeFactor: 2.5, interval: 7 }, 4)
    expect(result.repetitions).toBe(4)
    expect(result.interval).toBe(Math.round(7 * 2.5))
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('quality 5 (perfect) should increase ease factor', () => {
    const result = calculateSM2({ repetitions: 3, easeFactor: 2.5, interval: 7 }, 5)
    expect(result.easeFactor).toBeGreaterThan(2.5)
  })

  it('ease factor should never drop below 1.3', () => {
    const result = calculateSM2({ repetitions: 1, easeFactor: 1.3, interval: 1 }, 1)
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('should return appropriate stage based on quality', () => {
    // quality 4 with 2 reps → becomes 3 reps → mastered
    const good = calculateSM2({ repetitions: 2, easeFactor: 2.5, interval: 3 }, 4)
    expect(good.stage).toBe('mastered')

    // quality 1 resets → 0 reps → learning
    const bad = calculateSM2({ repetitions: 3, easeFactor: 2.5, interval: 7 }, 1)
    expect(bad.stage).toBe('learning')

    // quality 3 with 0 reps → 1 rep → review
    const mid = calculateSM2({ repetitions: 0, easeFactor: 2.5, interval: 0 }, 3)
    expect(mid.stage).toBe('review')
  })
})
