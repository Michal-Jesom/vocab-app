import { useCallback, useRef } from 'react'

function getEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  // Prefer a high-quality English voice
  const priority = (v: SpeechSynthesisVoice) => {
    if (v.lang.startsWith('en-US') && v.localService) return 3
    if (v.lang.startsWith('en-US')) return 2
    if (v.lang.startsWith('en') && v.localService) return 1
    if (v.lang.startsWith('en')) return 0
    return -1
  }
  let best: SpeechSynthesisVoice | null = null
  let bestScore = -1
  for (const v of voices) {
    const s = priority(v)
    if (s > bestScore) { best = v; bestScore = s }
  }
  return best
}

let voicesLoaded = false
function ensureVoices(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    if (voicesLoaded) {
      resolve(getEnglishVoice())
      return
    }
    const voices = speechSynthesis.getVoices()
    if (voices.length > 0) {
      voicesLoaded = true
      resolve(getEnglishVoice())
      return
    }
    const onChanged = () => {
      voicesLoaded = true
      speechSynthesis.removeEventListener('voiceschanged', onChanged)
      resolve(getEnglishVoice())
    }
    speechSynthesis.addEventListener('voiceschanged', onChanged)
    // Timeout in case voices never load
    setTimeout(() => {
      speechSynthesis.removeEventListener('voiceschanged', onChanged)
      resolve(getEnglishVoice())
    }, 2000)
  })
}

export function useTTS() {
  const lastWordRef = useRef('')

  const speak = useCallback(async (word: string) => {
    if (!word || word === lastWordRef.current) return
    lastWordRef.current = word

    speechSynthesis.cancel()
    const voice = await ensureVoices()

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = voice?.lang ?? 'en-US'
    utterance.rate = 0.85
    utterance.pitch = 1
    utterance.volume = 1
    if (voice) utterance.voice = voice

    speechSynthesis.speak(utterance)
  }, [])

  const replay = useCallback(async (word: string) => {
    lastWordRef.current = ''
    await speak(word)
  }, [speak])

  return { speak, replay }
}
