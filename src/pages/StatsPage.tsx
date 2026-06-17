import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/database'
import { getToday } from '../utils/format'

interface StatsData {
  totalVocab: number
  newCount: number
  learningCount: number
  reviewCount: number
  masteredCount: number
  todayLearned: number
  todayReviewed: number
  todayCorrect: number
  todayWrong: number
}

const STAGES = [
  { key: 'new', label: '新词', color: 'from-gray-400 to-gray-500', icon: '📥' },
  { key: 'learning', label: '学习中', color: 'from-orange-400 to-orange-500', icon: '📖' },
  { key: 'review', label: '复习中', color: 'from-blue-400 to-blue-500', icon: '🔄' },
  { key: 'mastered', label: '已掌握', color: 'from-green-400 to-green-500', icon: '⭐' },
] as const

export default function StatsPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    const load = async () => {
      const today = getToday()
      const endOfToday = new Date(today.getTime() + 86400000)

      const [totalVocab, newCount, learningCount, reviewCount, masteredCount, todayLogs] = await Promise.all([
        db.vocabulary.count(),
        db.learningState.where('stage').equals('new').count(),
        db.learningState.where('stage').equals('learning').count(),
        db.learningState.where('stage').equals('review').count(),
        db.learningState.where('stage').equals('mastered').count(),
        db.studyLog.where('date').between(today, endOfToday, true, true).toArray(),
      ])

      setStats({
        totalVocab, newCount, learningCount, reviewCount, masteredCount,
        todayLearned: todayLogs.filter(l => l.mode === 'learn').length,
        todayReviewed: todayLogs.filter(l => l.mode === 'review').length,
        todayCorrect: todayLogs.filter(l => l.correct).length,
        todayWrong: todayLogs.filter(l => !l.correct).length,
      })
    }
    load()
  }, [])

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">加载中...</p>
      </div>
    )
  }

  const masteredPercent = stats.totalVocab > 0
    ? Math.round((stats.masteredCount / stats.totalVocab) * 100)
    : 0

  const counts: Record<string, number> = {
    new: stats.newCount,
    learning: stats.learningCount,
    review: stats.reviewCount,
    mastered: stats.masteredCount,
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">学习统计</h1>

      {/* Mastery ring */}
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center space-y-3">
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-28 h-28 transform -rotate-90">
            <circle cx="56" cy="56" r="48" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="56" cy="56" r="48" fill="none" stroke="#22c55e" strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(masteredPercent / 100) * 302} 302`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-3xl font-bold text-green-600">{masteredPercent}</span>
            <span className="text-lg text-green-500">%</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm">掌握率 · {stats.masteredCount}/{stats.totalVocab} 词</p>
      </div>

      {/* Clickable category cards */}
      <div className="grid grid-cols-2 gap-3">
        {STAGES.map(({ key, label, color, icon }) => (
          <button
            key={key}
            onClick={() => navigate(`/words/${key}`)}
            className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-md hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 text-left`}
          >
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-2xl font-bold">{counts[key]}</div>
            <div className="text-sm opacity-80">{label}</div>
          </button>
        ))}
      </div>

      {/* Today's records */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-3">今日记录</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { label: '新学', count: stats.todayLearned, color: 'text-blue-600' },
            { label: '复习', count: stats.todayReviewed, color: 'text-orange-600' },
            { label: '正确', count: stats.todayCorrect, color: 'text-green-600' },
            { label: '错误', count: stats.todayWrong, color: 'text-red-600' },
          ].map(item => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <div className={`text-lg font-bold ${item.color}`}>{item.count}</div>
              <div className="text-xs text-gray-400">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
