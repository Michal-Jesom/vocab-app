import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onSave: (word: string, phonetic: string, definition: string) => void
  initial?: { word: string; phonetic: string; definition: string }
  title: string
}

export default function WordFormModal({ open, onClose, onSave, initial, title }: Props) {
  const [word, setWord] = useState('')
  const [phonetic, setPhonetic] = useState('')
  const [definition, setDefinition] = useState('')

  useEffect(() => {
    if (open) {
      setWord(initial?.word ?? '')
      setPhonetic(initial?.phonetic ?? '')
      setDefinition(initial?.definition ?? '')
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!word.trim() || !definition.trim()) return
    onSave(word.trim(), phonetic.trim(), definition.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 shadow-xl animate-slide-up">
        <h2 className="font-bold text-lg text-gray-800 mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-500 block mb-1">单词 *</label>
            <input
              value={word}
              onChange={e => setWord(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              placeholder="例如: apple"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">音标（可选）</label>
            <input
              value={phonetic}
              onChange={e => setPhonetic(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              placeholder="例如: /ˈæpəl/"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1">释义 *</label>
            <input
              value={definition}
              onChange={e => setDefinition(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              placeholder="例如: 苹果"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 rounded-xl font-medium text-sm text-gray-600 hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
