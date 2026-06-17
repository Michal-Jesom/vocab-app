import { useState, useEffect } from 'react'
import { db } from '../db/database'
import { getToday } from '../utils/format'

interface Report {
  totalVocab: number
  masteredPercent: number
  streak: number
  weeklyNewLearned: number
  weeklyReviewed: number
  weeklyAccuracy: number
  avgResponseTime: number
  hardWords: { word: string; definition: string; failCount: number }[]
  dailyStats: { date: string; learned: number; reviewed: number; correct: number }[]
}

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const generate = async () => {
      const today = getToday()
      const weekAgo = new Date(today.getTime() - 7 * 86400000)
      const endOfToday = new Date(today.getTime() + 86400000)

      const [totalVocab, mastered, allLogs, weekLogs, checkins] = await Promise.all([
        db.vocabulary.count(),
        db.learningState.where('stage').equals('mastered').count(),
        db.studyLog.toArray(),
        db.studyLog.where('date').between(weekAgo, endOfToday, true, true).toArray(),
        db.checkins.orderBy('date').reverse().toArray(),
      ])

      // Weekly stats
      const weeklyLearned = weekLogs.filter(l => l.mode === 'learn').length
      const weeklyReviewed = weekLogs.filter(l => l.mode === 'review').length
      const weeklyCorrect = weekLogs.filter(l => l.correct).length
      const weeklyAccuracy = weekLogs.length > 0 ? Math.round((weeklyCorrect / weekLogs.length) * 100) : 0

      // Average response time
      const reviewLogs = weekLogs.filter(l => l.mode === 'review' && l.responseTime > 0)
      const avgRT = reviewLogs.length > 0
        ? Math.round((reviewLogs.reduce((s, l) => s + l.responseTime, 0) / reviewLogs.length) * 10) / 10
        : 0

      // Hard words (most mistakes)
      const failMap = new Map<number, number>()
      const vocabFailMap = new Map<number, { word: string; definition: string }>()
      for (const log of allLogs) {
        if (!log.correct) {
          failMap.set(log.vocabId, (failMap.get(log.vocabId) || 0) + 1)
        }
      }
      const failVocabIds = [...failMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0])
      const failVocabs = failVocabIds.length > 0
        ? await db.vocabulary.where('id').anyOf(failVocabIds).toArray()
        : []
      for (const v of failVocabs) {
        if (v.id != null) vocabFailMap.set(v.id, { word: v.word, definition: v.definition })
      }
      const hardWords = [...failMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([vocabId, count]) => ({
          word: vocabFailMap.get(vocabId)?.word ?? '?',
          definition: vocabFailMap.get(vocabId)?.definition ?? '?',
          failCount: count,
        }))

      // Daily stats for last 7 days
      const dailyStats = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86400000)
        const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        const dEnd = new Date(dStart.getTime() + 86400000)
        const dayLogs = allLogs.filter(l => {
          const lt = l.date.getTime()
          return lt >= dStart.getTime() && lt < dEnd.getTime()
        })
        dailyStats.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          learned: dayLogs.filter(l => l.mode === 'learn').length,
          reviewed: dayLogs.filter(l => l.mode === 'review').length,
          correct: dayLogs.filter(l => l.correct).length,
        })
      }

      // Streak
      let streak = 0
      const now = new Date()
      for (let i = 0; i < 365; i++) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (checkins.some(c => c.date === key)) streak++
        else if (i > 0) break
      }

      setReport({
        totalVocab,
        masteredPercent: totalVocab > 0 ? Math.round((mastered / totalVocab) * 100) : 0,
        streak,
        weeklyNewLearned: weeklyLearned,
        weeklyReviewed: weeklyReviewed,
        weeklyAccuracy,
        avgResponseTime: avgRT,
        hardWords,
        dailyStats,
      })
      setLoading(false)
    }
    generate()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">生成报告中...</p>
      </div>
    )
  }

  if (!report) return null

  const maxDaily = Math.max(1, ...report.dailyStats.map(d => d.learned + d.reviewed))

  return (
    <div className="p-4 space-y-5 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">学习报告</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-xs opacity-80">连续签到</p>
          <p className="text-3xl font-bold">{report.streak}<span className="text-lg font-normal">天</span></p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-xs opacity-80">掌握率</p>
          <p className="text-3xl font-bold">{report.masteredPercent}<span className="text-lg font-normal">%</span></p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-xs opacity-80">7天新学</p>
          <p className="text-3xl font-bold">{report.weeklyNewLearned}<span className="text-lg font-normal">词</span></p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg">
          <p className="text-xs opacity-80">7天正确率</p>
          <p className="text-3xl font-bold">{report.weeklyAccuracy}<span className="text-lg font-normal">%</span></p>
        </div>
      </div>

      {/* Daily activity chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 mb-4">7天学习趋势</h2>
        <div className="flex items-end gap-1 h-32">
          {report.dailyStats.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '110px' }}>
                <div
                  className="w-full bg-blue-400 rounded-t"
                  style={{ height: `${(d.learned / maxDaily) * 100}%`, minHeight: d.learned > 0 ? '4px' : '0' }}
                />
                <div
                  className="w-full bg-orange-400 rounded-b"
                  style={{ height: `${(d.reviewed / maxDaily) * 100}%`, minHeight: d.reviewed > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-[10px] text-gray-400">{d.date}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded-sm" /> 新学</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded-sm" /> 复习</span>
        </div>
      </div>

      {/* Weak words */}
      {report.hardWords.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">
            薄弱词汇 <span className="text-sm font-normal text-gray-400">（错误最多）</span>
          </h2>
          <div className="space-y-2">
            {report.hardWords.slice(0, 5).map((w, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{w.word}</p>
                  <p className="text-xs text-gray-400">{w.definition}</p>
                </div>
                <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
                  错{w.failCount}次
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-300 pb-4">
        累计 {report.totalVocab} 词 · 平均响应 {report.avgResponseTime}秒
      </p>
    </div>
  )
}
