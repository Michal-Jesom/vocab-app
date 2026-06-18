import { useState, useCallback } from 'react'
import { db } from '../db/database'
import { createInitialState } from '../engine/sm2'
import type { ParseResult } from '../parser/docxParser'

type FileType = 'docx' | 'pdf' | 'image'

function getFileType(file: File): FileType | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'docx') return 'docx'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image'
  return null
}

export function useVocabulary() {
  const [importing, setImporting] = useState(false)
  const [lastResult, setLastResult] = useState<ParseResult | null>(null)
  const [ocrProgress, setOcrProgress] = useState<string>('')

  const importFile = useCallback(async (file: File) => {
    setImporting(true)
    setOcrProgress('')
    try {
      const ft = getFileType(file)
      if (!ft) throw new Error(`Unsupported file type`)

      let result: ParseResult

      if (ft === 'image') {
        setOcrProgress('正在 OCR 识别文字...')
        const { parseImageFile } = await import('../parser/imageParser')
        result = await parseImageFile(file)
      } else if (ft === 'pdf') {
        const { parsePdfFile } = await import('../parser/pdfParser')
        result = await parsePdfFile(file)
      } else {
        const { parseDocxFile } = await import('../parser/docxParser')
        result = await parseDocxFile(file)
      }

      const existing = await db.vocabulary.toArray()
      const existingWords = new Set(existing.map(v => v.word.toLowerCase()))

      const newWords = result.words.filter(w => !existingWords.has(w.word.toLowerCase()))

      const now = new Date()
      const vocabIds = await db.transaction('rw', db.vocabulary, db.learningState, async () => {
        const ids: number[] = []
        for (const w of newWords) {
          const id = await db.vocabulary.add({
            word: w.word,
            phonetic: w.phonetic,
            definition: w.definition,
            createdAt: now,
            source: file.name,
          })
          const state = createInitialState(id)
          await db.learningState.add(state)
          ids.push(id)
        }
        return ids
      })

      const finalResult: ParseResult = {
        words: result.words,
        errors: result.errors,
      }
      setLastResult(finalResult)
      return {
        ...finalResult,
        imported: vocabIds.length,
        skipped: result.words.length - vocabIds.length,
      }
    } finally {
      setImporting(false)
      setOcrProgress('')
    }
  }, [])

  const getTotalCount = useCallback(async () => {
    return db.vocabulary.count()
  }, [])

  const getMasteredCount = useCallback(async () => {
    return db.learningState.where('stage').equals('mastered').count()
  }, [])

  const addWord = useCallback(async (word: string, phonetic: string, definition: string) => {
    const now = new Date()
    const existing = await db.vocabulary.where('word').equalsIgnoreCase(word).first()
    if (existing) return existing.id!

    const id = await db.transaction('rw', db.vocabulary, db.learningState, async () => {
      const vid = await db.vocabulary.add({ word, phonetic, definition, createdAt: now, source: '手动添加' })
      await db.learningState.add(createInitialState(vid))
      return vid
    })
    return id
  }, [])

  const updateWord = useCallback(async (id: number, word: string, phonetic: string, definition: string) => {
    await db.vocabulary.update(id, { word, phonetic, definition })
  }, [])

  const deleteWord = useCallback(async (id: number) => {
    await db.transaction('rw', db.vocabulary, db.learningState, db.studyLog, async () => {
      await db.vocabulary.delete(id)
      await db.learningState.where('vocabId').equals(id).delete()
      await db.studyLog.where('vocabId').equals(id).delete()
    })
  }, [])

  return { importFile, importing, lastResult, getTotalCount, getMasteredCount, ocrProgress, addWord, updateWord, deleteWord }
}
