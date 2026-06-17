import { useNavigate } from 'react-router-dom'
import FlashCard from '../components/FlashCard'
import { useLearningSession } from '../hooks/useLearningSession'

export default function LearnPage() {
  const navigate = useNavigate()
  const { currentWord, currentIndex, words, loading, finished, results, rateWord } = useLearningSession()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">加载中...</p>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-5xl">🎉</p>
        <p className="text-gray-500 text-lg">没有待学习的新词</p>
        <p className="text-gray-400 text-sm">请先导入词汇</p>
        <button onClick={() => navigate('/import')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">
          去导入
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-5xl">✅</p>
        <p className="text-xl font-bold text-gray-800">学习完成！</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-center text-sm">
          <div className="bg-green-50 rounded-xl p-3">
            <div className="text-green-600 font-bold text-lg">{results.rated5 + results.rated4}</div>
            <div className="text-green-500">已掌握</div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-3">
            <div className="text-yellow-600 font-bold text-lg">{results.rated3}</div>
            <div className="text-yellow-500">模糊</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 col-span-2">
            <div className="text-red-600 font-bold text-lg">{results.rated2 + results.rated1}</div>
            <div className="text-red-500">需加强</div>
          </div>
        </div>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium">
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 min-h-screen flex flex-col justify-center">
      {currentWord && (
        <FlashCard
          key={currentIndex}
          word={currentWord.word}
          phonetic={currentWord.phonetic}
          definition={currentWord.definition}
          onRate={rateWord}
          current={currentIndex + 1}
          total={words.length}
        />
      )}
    </div>
  )
}
