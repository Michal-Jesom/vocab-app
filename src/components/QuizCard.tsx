import { useState, useRef, useEffect } from 'react'
import { useTTS } from '../hooks/useTTS'

interface QuizCardProps {
  word: string
  phonetic: string
  correctDefinition: string
  options: string[]
  onAnswer: (quality: number, responseTime: number) => void
  current: number
  total: number
}

export default function QuizCard({ word, phonetic, correctDefinition, options, onAnswer, current, total }: QuizCardProps) {
  const [answered, setAnswered] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const startTimeRef = useRef(Date.now())
  const { speak, replay } = useTTS()

  useEffect(() => {
    speak(word)
  }, [word, speak])

  const handleSelect = (option: string) => {
    if (answered) return
    const responseTime = (Date.now() - startTimeRef.current) / 1000
    setSelected(option)
    setAnswered(true)
    const correct = option === correctDefinition
    const quality = correct ? (responseTime < 3 ? 4 : 3) : 1
    setTimeout(() => {
      onAnswer(quality, responseTime)
    }, 800)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-gray-400">{current} / {total}</div>

      <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-xs">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <p className="text-3xl font-bold text-gray-800">{word}</p>
          <button
            onClick={(e) => { e.stopPropagation(); replay(word) }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 transition-colors active:scale-90"
            title="朗读"
          >
            <span className="text-sm">🔊</span>
          </button>
        </div>
        {phonetic && <p className="text-gray-400 text-sm mt-1">{phonetic}</p>}
      </div>

      <div className="w-full max-w-sm space-y-2.5">
        {options.map((option, i) => {
          let buttonStyle = 'bg-white border-gray-200 text-gray-700'
          if (answered) {
            if (option === correctDefinition) {
              buttonStyle = 'bg-green-50 border-green-400 text-green-700'
            } else if (option === selected) {
              buttonStyle = 'bg-red-50 border-red-400 text-red-700'
            } else {
              buttonStyle = 'bg-gray-50 border-gray-100 text-gray-300'
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(option)}
              disabled={answered}
              className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all text-base ${buttonStyle}`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
