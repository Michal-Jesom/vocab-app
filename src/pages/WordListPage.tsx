import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, type LearningStage } from '../db/database'
import { useVocabulary } from '../hooks/useVocabulary'
import WordFormModal from '../components/WordFormModal'

interface WordItem {
  id: number
  word: string
  phonetic: string
  definition: string
  stage: LearningStage
  easeFactor: number
  interval: number
  nextReviewDate: Date
}

const STAGE_LABELS: Record<LearningStage, string> = {
  new: '新词',
  learning: '学习中',
  review: '复习中',
  mastered: '已掌握',
}

const STAGE_COLORS: Record<LearningStage, string> = {
  new: 'bg-gray-100 text-gray-700',
  learning: 'bg-orange-100 text-orange-700',
  review: 'bg-blue-100 text-blue-700',
  mastered: 'bg-green-100 text-green-700',
}

export default function WordListPage() {
  const { stage } = useParams<{ stage: LearningStage }>()
  const navigate = useNavigate()
  const { addWord, updateWord, deleteWord } = useVocabulary()
  const [words, setWords] = useState<WordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingWord, setEditingWord] = useState<WordItem | null>(null)

  const loadWords = useCallback(async () => {
    if (!stage) return
    const states = await db.learningState.where('stage').equals(stage).toArray()
    const vocabIds = states.map(s => s.vocabId)
    const vocabs = vocabIds.length > 0
      ? await db.vocabulary.where('id').anyOf(vocabIds).toArray()
      : []
    const vocabMap = new Map(vocabs.map(v => [v.id!, v]))
    const items: WordItem[] = states.map(s => ({
      id: s.vocabId,
      word: vocabMap.get(s.vocabId)?.word ?? '?',
      phonetic: vocabMap.get(s.vocabId)?.phonetic ?? '',
      definition: vocabMap.get(s.vocabId)?.definition ?? '?',
      stage: s.stage,
      easeFactor: s.easeFactor,
      interval: s.interval,
      nextReviewDate: s.nextReviewDate,
    }))
    items.sort((a, b) => a.word.localeCompare(b.word))
    setWords(items)
    setLoading(false)
  }, [stage])

  useEffect(() => { loadWords() }, [loadWords])

  const handleAdd = async (word: string, phonetic: string, definition: string) => {
    await addWord(word, phonetic, definition)
    await loadWords()
  }

  const handleEdit = async (word: string, phonetic: string, definition: string) => {
    if (!editingWord) return
    await updateWord(editingWord.id, word, phonetic, definition)
    setEditingWord(null)
    await loadWords()
  }

  const handleDelete = async (w: WordItem) => {
    if (!confirm(`删除「${w.word}」？\n该操作不可恢复，相关的学习记录也会一并删除。`)) return
    await deleteWord(w.id)
    await loadWords()
  }

  if (!stage || !STAGE_LABELS[stage]) return null

  return (
    <div className="p-4 space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-blue-600 text-sm font-medium">
            ← 返回
          </button>
          <h1 className="text-xl font-bold text-gray-800">
            {STAGE_LABELS[stage]} ({words.length})
          </h1>
        </div>
        <button
          onClick={() => { setEditingWord(null); setShowModal(true) }}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors active:scale-95"
        >
          + 添加
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">加载中...</p>
      ) : words.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p>暂无{STAGE_LABELS[stage]}词汇</p>
        </div>
      ) : (
        <div className="space-y-2">
          {words.map(w => (
            <div key={w.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-semibold text-gray-800 truncate">{w.word}</p>
                  {w.phonetic && <p className="text-xs text-gray-400 mt-0.5">{w.phonetic}</p>}
                  <p className="text-sm text-gray-500 truncate mt-0.5">{w.definition}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {w.stage !== 'new' && w.stage !== 'mastered' && (
                    <span className="text-xs text-gray-400">{w.interval}天</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[w.stage]}`}>
                    {STAGE_LABELS[w.stage]}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                <button
                  onClick={() => { setEditingWord(w); setShowModal(true) }}
                  className="text-xs text-gray-400 hover:text-blue-600 transition-colors px-1"
                >
                  ✏️ 编辑
                </button>
                <button
                  onClick={() => handleDelete(w)}
                  className="text-xs text-gray-400 hover:text-red-600 transition-colors px-1"
                >
                  🗑️ 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WordFormModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingWord(null) }}
        onSave={editingWord ? handleEdit : handleAdd}
        initial={editingWord ? { word: editingWord.word, phonetic: editingWord.phonetic, definition: editingWord.definition } : undefined}
        title={editingWord ? '编辑单词' : '添加单词'}
      />
    </div>
  )
}
