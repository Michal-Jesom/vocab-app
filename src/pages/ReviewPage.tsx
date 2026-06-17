import { useNavigate } from 'react-router-dom'
import QuizCard from '../components/QuizCard'
import { useReviewSession } from '../hooks/useReviewSession'

export default function ReviewPage() {
  const navigate = useNavigate()
  const { currentWord, currentIndex, words, loading, finished, results, answerWord } = useReviewSession()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">加载待复习词汇...</p>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-5xl">🎉</p>
        <p className="text-gray-500 text-lg">无需复习</p>
        <p className="text-gray-400 text-sm">所有词汇都在正确的时间间隔中</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">
          返回首页
        </button>
      </div>
    )
  }

  if (finished) {
    const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-5xl">✅</p>
        <p className="text-xl font-bold text-gray-800">复习完成！</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-center text-sm">
          <div className="bg-green-50 rounded-xl p-3">
            <div className="text-green-600 font-bold text-lg">{results.correct}</div>
            <div className="text-green-500">正确</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3">
            <div className="text-red-600 font-bold text-lg">{results.wrong}</div>
            <div className="text-red-500">错误</div>
          </div>
        </div>
        <div className="text-2xl font-bold text-blue-600">{accuracy}%</div>
        <div className="text-gray-400 text-sm">正确率</div>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 min-h-screen flex flex-col justify-center">
      {currentWord && (
        <QuizCard
          key={currentIndex}
          word={currentWord.word}
          phonetic={currentWord.phonetic}
          correctDefinition={currentWord.definition}
          options={currentWord.options}
          onAnswer={answerWord}
          current={currentIndex + 1}
          total={words.length}
        />
      )}
    </div>
  )
}
