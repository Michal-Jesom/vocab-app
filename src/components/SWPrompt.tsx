import { useState, useEffect } from 'react'

type SWStatus = 'checking' | 'installing' | 'ready' | 'error' | 'unsupported'

export default function SWPrompt() {
  const [status, setStatus] = useState<SWStatus>('checking')
  const [message, setMessage] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setStatus('unsupported')
      setMessage('浏览器不支持离线功能')
      return
    }

    let timeout: ReturnType<typeof setTimeout>

    const register = async () => {
      try {
        // Don't register manually — vite-plugin-pwa handles it via registerSW.js
        // Just observe the existing registration
        const reg = await navigator.serviceWorker.getRegistration()

        if (!reg) {
          // No registration yet, check again later
          setTimeout(() => {
            navigator.serviceWorker.getRegistration().then(r => {
              if (r?.active) {
                setStatus('ready')
                setMessage('已就绪，可离线使用')
                timeout = setTimeout(() => setDismissed(true), 4000)
              }
            })
          }, 3000)
          return
        }

        setMessage('正在缓存离线资源...')
        setStatus('installing')

        if (reg.installing) {
          reg.installing.addEventListener('statechange', () => {
            if (reg.installing?.state === 'installed') {
              setStatus('ready')
              setMessage('已就绪，可离线使用')
              timeout = setTimeout(() => setDismissed(true), 5000)
            }
          })
        } else if (reg.active) {
          setStatus('ready')
          setMessage('已就绪，可离线使用')
          timeout = setTimeout(() => setDismissed(true), 4000)
        }

        // Handle waiting SW (update available)
        if (reg.waiting) {
          setMessage('发现新版本')
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setMessage('发现新版本，刷新页面即可更新')
            }
          })
        })
      } catch (err) {
        console.error('SW registration failed:', err)
        setStatus('error')
        setMessage('离线缓存失败，请刷新页面重试')
      }
    }

    // Delay slightly to not slow initial render
    const initTimer = setTimeout(register, 500)

    // Listen for controller change
    const onControllerChange = () => {
      setStatus('ready')
      setMessage('已就绪，可离线使用')
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      clearTimeout(initTimer)
      clearTimeout(timeout)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (status === 'unsupported' || status === 'checking' || dismissed) return null

  const colorMap: Record<SWStatus, string> = {
    checking: 'bg-gray-500',
    installing: 'bg-yellow-500',
    ready: 'bg-green-600',
    error: 'bg-red-500',
    unsupported: 'bg-gray-500',
  }

  return (
    <div className={`fixed bottom-20 left-4 right-4 z-50 ${colorMap[status]} text-white text-center text-sm font-medium py-3 px-4 rounded-xl shadow-lg animate-slide-up`}>
      {message}
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 opacity-70 hover:opacity-100"
        aria-label="关闭"
      >
        ✕
      </button>
    </div>
  )
}
