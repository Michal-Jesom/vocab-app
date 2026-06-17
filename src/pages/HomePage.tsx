import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateDailyPlan } from '../engine/planner'
import { useVocabulary } from '../hooks/useVocabulary'
import { useSettings } from '../hooks/useSettings'
import { useCheckin } from '../hooks/useCheckin'
import { formatDate } from '../utils/format'
import { db } from '../db/database'
import WordFormModal from '../components/WordFormModal'
import { useInstallPrompt } from '../components/InstallPrompt'

export default function HomePage() {
  const navigate = useNavigate()
  const { getTotalCount, getMasteredCount, addWord } = useVocabulary()
  const { settings, loading: settingsLoading, updateSettings } = useSettings()
  const { streak, checkedToday, checkin } = useCheckin()
  const [plan, setPlan] = useState({ newCount: 0, reviewCount: 0 })
  const [totalCount, setTotalCount] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [stageCounts, setStageCounts] = useState({ new: 0, learning: 0, review: 0, mastered: 0 })
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const { showInstall, install } = useInstallPrompt()

  const refreshData = async () => {
    const [p, t, m, n, l, r, ms] = await Promise.all([
      generateDailyPlan(),
      getTotalCount(),
      getMasteredCount(),
      db.learningState.where('stage').equals('new').count(),
      db.learningState.where('stage').equals('learning').count(),
      db.learningState.where('stage').equals('review').count(),
      db.learningState.where('stage').equals('mastered').count(),
    ])
    setPlan({ newCount: p.newCount, reviewCount: p.reviewCount })
    setTotalCount(t)
    setMasteredCount(m)
    setStageCounts({ new: n, learning: l, review: r, mastered: ms })
    setLoading(false)
  }

  useEffect(() => { refreshData() }, [getTotalCount, getMasteredCount, settings])

  const handleCheckin = async () => {
    await checkin()
    await refreshData()
  }

  const handleNewWordsChange = (value: number) => {
    updateSettings({ dailyNewWords: Math.max(1, Math.min(500, value)) })
  }

  const handleReviewLimitChange = (value: number) => {
    updateSettings({ dailyReviewLimit: Math.max(1, Math.min(500, value)) })
  }

  const handleAddWord = async (word: string, phonetic: string, definition: string) => {
    await addWord(word, phonetic, definition)
    await refreshData()
  }

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  const masteredPercent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0

  return (
    <div className="p-4 space-y-5 bg-gradient-to-b from-blue-50/50 pb-8">
      {/* Header with date and streak */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs text-gray-400">{formatDate(new Date())}</p>
          <h1 className="text-xl font-bold text-gray-800">背单词</h1>
        </div>
        <button
          onClick={handleCheckin}
          disabled={checkedToday}
          className={`relative px-4 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 ${
            checkedToday
              ? 'bg-green-100 text-green-600'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200 hover:shadow-xl'
          }`}
        >
          {checkedToday ? `已签到 · ${streak}天` : `签到 · ${streak}天`}
          {checkedToday && (
            <span className="absolute -top-1 -right-1 text-lg">✅</span>
          )}
        </button>
      </div>

      {/* Install prompt */}
      {showInstall && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg animate-[fadeIn_0.3s_ease-out] flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">添加到主屏幕</p>
            <p className="text-xs opacity-80 mt-0.5">一键打开，像 App 一样使用</p>
          </div>
          <button
            onClick={install}
            className="px-4 py-2 bg-white text-blue-600 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          >
            安装
          </button>
        </div>
      )}

      {/* Today's tasks */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/learn')}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="text-3xl mb-2">🆕</div>
          <div className="text-3xl font-bold text-blue-600">{plan.newCount}</div>
          <div className="text-gray-500 text-sm">今日新词</div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
            <div className="bg-blue-400 h-1 rounded-full" style={{ width: `${Math.min(100, (plan.newCount / settings.dailyNewWords) * 100)}%` }} />
          </div>
        </button>
        <button
          onClick={() => navigate('/review')}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50 text-left hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="text-3xl mb-2">🔄</div>
          <div className="text-3xl font-bold text-orange-500">{plan.reviewCount}</div>
          <div className="text-gray-500 text-sm">待复习</div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1">
            <div className="bg-orange-400 h-1 rounded-full" style={{ width: `${Math.min(100, (plan.reviewCount / settings.dailyReviewLimit) * 100)}%` }} />
          </div>
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/learn')}
          disabled={plan.newCount === 0}
          className="flex-1 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-200 hover:shadow-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          🃏 开始学习
        </button>
        <button
          onClick={() => navigate('/review')}
          disabled={plan.reviewCount === 0}
          className="flex-1 py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl font-semibold shadow-lg shadow-orange-200 hover:shadow-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          ✅ 开始复习
        </button>
      </div>

      {/* Quick report button */}
      <button
        onClick={() => navigate('/report')}
        className="w-full py-3 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-center gap-2 text-gray-600 font-medium hover:shadow-md transition-all active:scale-[0.98]"
      >
        <span className="text-lg">📋</span>
        查看学习报告
        <span className="text-gray-300">→</span>
      </button>

      {/* Quick add word */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-3 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center gap-2 text-blue-600 font-medium hover:shadow-md transition-all active:scale-[0.98]"
      >
        <span className="text-lg">➕</span>
        手动添加单词
      </button>

      {/* Category overview - clickable */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
        <h2 className="font-semibold text-gray-800 mb-3">词汇分布</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'new', label: '新词', count: stageCounts.new, color: 'from-gray-400 to-gray-500', icon: '📥' },
            { key: 'learning', label: '学习中', count: stageCounts.learning, color: 'from-orange-400 to-orange-500', icon: '📖' },
            { key: 'review', label: '复习', count: stageCounts.review, color: 'from-blue-400 to-blue-500', icon: '🔄' },
            { key: 'mastered', label: '已掌握', count: stageCounts.mastered, color: 'from-green-400 to-green-500', icon: '⭐' },
          ].map(({ key, label, count, icon }) => (
            <button
              key={key}
              onClick={() => navigate(`/words/${key}`)}
              disabled={count === 0}
              className="text-center group disabled:opacity-40"
            >
              <div className="text-xl mb-1 group-hover:scale-110 transition-transform">{icon}</div>
              <div className="text-lg font-bold text-gray-800">{count}</div>
              <div className="text-[10px] text-gray-400">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mastery progress */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
        <div className="flex justify-between items-end mb-2">
          <h2 className="font-semibold text-gray-800">掌握进度</h2>
          <span className="text-sm font-bold text-green-600">{masteredPercent}%</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-700"
            style={{ width: `${masteredPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>已掌握 {masteredCount}</span>
          <span>共 {totalCount}</span>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">学习计划</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-blue-600 text-sm font-medium"
          >
            {showSettings ? '收起' : '调整'}
          </button>
        </div>

        {showSettings && (
          <div className="space-y-3 pt-3 mt-3 border-t border-gray-50">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">每日新词</label>
              <div className="flex items-center gap-2">
                <button onClick={() => handleNewWordsChange(settings.dailyNewWords - 10)} className="w-7 h-7 bg-gray-100 rounded-lg font-bold hover:bg-gray-200">−</button>
                <input type="number" value={settings.dailyNewWords} onChange={e => handleNewWordsChange(Number(e.target.value))} className="w-14 text-center border border-gray-200 rounded-lg py-1 text-sm font-bold" min={1} max={500} />
                <button onClick={() => handleNewWordsChange(settings.dailyNewWords + 10)} className="w-7 h-7 bg-gray-100 rounded-lg font-bold hover:bg-gray-200">+</button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">每日复习上限</label>
              <div className="flex items-center gap-2">
                <button onClick={() => handleReviewLimitChange(settings.dailyReviewLimit - 10)} className="w-7 h-7 bg-gray-100 rounded-lg font-bold hover:bg-gray-200">−</button>
                <input type="number" value={settings.dailyReviewLimit} onChange={e => handleReviewLimitChange(Number(e.target.value))} className="w-14 text-center border border-gray-200 rounded-lg py-1 text-sm font-bold" min={1} max={500} />
                <button onClick={() => handleReviewLimitChange(settings.dailyReviewLimit + 10)} className="w-7 h-7 bg-gray-100 rounded-lg font-bold hover:bg-gray-200">+</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <WordFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddWord}
        title="添加单词"
      />
    </div>
  )
}
