import { useState, useRef } from 'react'
import { useVocabulary } from '../hooks/useVocabulary'

const ACCEPT = '.docx,.pdf,.png,.jpg,.jpeg'

export default function ImportPage() {
  const { importFile, importing, lastResult, ocrProgress } = useVocabulary()
  const [status, setStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['docx', 'pdf', 'png', 'jpg', 'jpeg'].includes(ext || '')) {
      setStatus('❌ 请选择 .docx / .pdf / .png / .jpg 格式的文件')
      return
    }

    const isImage = ext === 'png' || ext === 'jpg' || ext === 'jpeg'
    setStatus(isImage ? '⏳ 正在 OCR 识别...' : '⏳ 正在解析...')
    try {
      const result = await importFile(file)
      setStatus(
        `✅ 导入完成！新增 ${result.imported} 个词汇，跳过 ${result.skipped} 个重复`
      )
    } catch {
      setStatus('❌ 解析失败，请检查文件格式')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">导入词汇</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <p className="text-gray-500 text-sm leading-relaxed">
          支持 Word (.docx)、PDF、以及图片 (.png/.jpg)。<br />
          图片会通过 OCR 自动识别文字，每行格式灵活
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {importing ? (ocrProgress || '⏳ 解析中...') : '📁 选择文件'}
          </button>
          <p className="text-gray-400 text-xs mt-3">
            支持 .docx .pdf .png .jpg 格式
          </p>
        </div>

        {status && (
          <div className={`p-3 rounded-xl text-sm ${
            status.startsWith('✅') ? 'bg-green-50 text-green-700'
            : status.startsWith('❌') ? 'bg-red-50 text-red-700'
            : 'bg-blue-50 text-blue-700'
          }`}>
            {status}
          </div>
        )}
      </div>

      {lastResult && (
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800">解析详情</h2>
          <div className="flex gap-4 text-sm">
            <div className="bg-green-50 px-3 py-2 rounded-lg">
              <span className="text-green-600 font-bold">{lastResult.words.length}</span>
              <span className="text-green-500 ml-1">条成功</span>
            </div>
            <div className="bg-red-50 px-3 py-2 rounded-lg">
              <span className="text-red-600 font-bold">{lastResult.errors.length}</span>
              <span className="text-red-500 ml-1">条失败</span>
            </div>
          </div>

          {lastResult.errors.length > 0 && (
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer">查看失败行</summary>
              <ul className="mt-2 space-y-1">
                {lastResult.errors.map((e, i) => (
                  <li key={i}>
                    第 {e.line} 行: {e.text}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
