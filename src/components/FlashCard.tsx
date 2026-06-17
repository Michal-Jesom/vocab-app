import { useState, useEffect, useRef } from 'react'
import { useTTS } from '../hooks/useTTS'

interface FlashCardProps {
  word: string
  phonetic: string
  definition: string
  onRate: (quality: number) => void
  current: number
  total: number
}

function charOverlap(a: string, b: string): number {
  const setA = new Set(a.replace(/\s+/g, ''))
  const setB = new Set(b.replace(/\s+/g, ''))
  if (setA.size === 0 || setB.size === 0) return 0
  let intersection = 0
  for (const c of setA) {
    if (setB.has(c)) intersection++
  }
  return intersection / Math.max(setA.size, setB.size)
}

type Phase = 'judge' | 'recall' | 'result' | 'done'

export default function FlashCard({ word, phonetic, definition, onRate, current, total }: FlashCardProps) {
  const [phase, setPhase] = useState<Phase>('judge')
  const [userInput, setUserInput] = useState('')
  const [matchScore, setMatchScore] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { speak, replay } = useTTS()

  useEffect(() => {
    speak(word)
  }, [word, speak])

  const handleKnow = () => {
    setPhase('recall')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleDontKnow = () => {
    setPhase('done')
  }

  const handleSubmit = () => {
    if (!userInput.trim()) return
    const score = charOverlap(userInput.trim(), definition)
    setMatchScore(score)
    setPhase('result')
  }

  const handleResultRate = (quality: number) => {
    setPhase('judge')
    setUserInput('')
    setMatchScore(0)
    onRate(quality)
  }

  const handleDontKnowRate = () => {
    setPhase('judge')
    onRate(1)
  }

  const progressPct = (current / total) * 100

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-gray-400">{current} / {total}</div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-xs">
        <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Word display */}
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-3xl font-bold text-gray-800">{word}</p>
          <button
            onClick={(e) => { e.stopPropagation(); replay(word) }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 transition-colors active:scale-90"
          >
            <span className="text-sm">🔊</span>
          </button>
        </div>
        {phonetic && <p className="text-gray-400 text-sm mt-1">{phonetic}</p>}
      </div>

      {/* Phase: judge - do you know this word? */}
      {phase === 'judge' && (
        <div className="w-full max-w-sm space-y-2.5 animate-[fadeIn_0.3s_ease-out]">
          <p className="text-center text-sm text-gray-500 mb-1">你认识这个单词吗？</p>
          <button
            onClick={handleKnow}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors active:scale-[0.98]"
          >
            我认识
          </button>
          <button
            onClick={handleDontKnow}
            className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-colors active:scale-[0.98]"
          >
            不认识
          </button>
        </div>
      )}

      {/* Phase: recall - type the meaning */}
      {phase === 'recall' && (
        <div className="w-full max-w-sm space-y-3 animate-[fadeIn_0.3s_ease-out]">
          <p className="text-center text-sm text-gray-500">
            请输入对应的中文意思
          </p>
          <input
            ref={inputRef}
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            placeholder="输入中文释义..."
          />
          <button
            onClick={handleSubmit}
            disabled={!userInput.trim()}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-30 transition-colors active:scale-[0.98]"
          >
            确认
          </button>
        </div>
      )}

      {/* Phase: result - show comparison */}
      {phase === 'result' && (
        <div className="w-full max-w-sm space-y-3 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">你的回答</p>
              <p className="text-sm text-gray-700">{userInput}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">正确答案</p>
              <p className="text-sm font-medium text-gray-800">{definition}</p>
            </div>
          </div>

          {matchScore >= 0.5 ? (
            <div className="text-center">
              <p className="text-green-600 font-bold text-lg mb-3">回答正确！</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResultRate(4)}
                  className="flex-1 py-2.5 bg-green-100 text-green-700 rounded-xl font-medium text-sm hover:bg-green-200 transition-colors"
                >
                  基本正确
                </button>
                <button
                  onClick={() => handleResultRate(5)}
                  className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors"
                >
                  完全正确
                </button>
              </div>
            </div>
          ) : matchScore >= 0.25 ? (
            <div className="text-center">
              <p className="text-orange-600 font-bold text-lg mb-3">不太准确</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResultRate(2)}
                  className="flex-1 py-2.5 bg-orange-100 text-orange-700 rounded-xl font-medium text-sm hover:bg-orange-200 transition-colors"
                >
                  差很多
                </button>
                <button
                  onClick={() => handleResultRate(3)}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium text-sm hover:bg-orange-600 transition-colors"
                >
                  接近了
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-red-600 font-bold text-lg mb-3">回答错误</p>
              <button
                onClick={() => handleResultRate(2)}
                className="w-full py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600 transition-colors"
              >
                知道了
              </button>
            </div>
          )}
        </div>
      )}

      {/* Phase: done - user doesn't know the word */}
      {phase === 'done' && (
        <div className="w-full max-w-sm space-y-3 animate-[fadeIn_0.3s_ease-out]">
          <div className="bg-blue-50 rounded-xl p-5 text-center shadow-sm">
            <p className="text-xs text-blue-400 mb-1">正确答案</p>
            <p className="text-xl font-medium text-gray-800">{definition}</p>
            {phonetic && <p className="text-sm text-gray-400 mt-1">{phonetic}</p>}
          </div>
          <button
            onClick={handleDontKnowRate}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors active:scale-[0.98]"
          >
            记住了，继续
          </button>
        </div>
      )}
    </div>
  )
}
