'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Bot, X, Send, Loader2, Sparkles, MessageSquareText, Search, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { hapticLight, hapticMedium } from '@/lib/haptic'
import { getPublicAiSettings } from '@/app/actions/settings'

type Message = {
  role: 'user' | 'model'
  content: string
}

export function AIChatWidget() {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content:
        'Ой, ну привет! 🙄 Я тут вообще-то корпоративный AI-ассистент, а не просто так.\n\nМогу поискать твои бумажки, письма и дедлайны, если, конечно, очень попросишь. Что нужно-то? 💅✨',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ name: string; dataUrl: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getPublicAiSettings().then((res) => {
      setIsEnabled(res.aiEnabled && res.aiChatEnabled)
      setMounted(true)
    })
  }, [])

  // Ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Fix: Safe local scroll without affecting the window
  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    const handleNewLetter = (e: Event) => {
      const customEvent = e as CustomEvent
      const { number, org } = customEvent.detail || {}

      const snarkyMessages = [
        `Уф, опять новая бумажка? 🙄 Письмо${number ? ` №${number}` : ''} от ${org || 'кого-то там'} загружено. Ладно, добавила в базу. Иди работай!`,
        `Ну вот, притащили ещё одно письмо... 😒 Опять мне всё это читать и запоминать? Окей, всё сделала. 💅`,
        `Ой, всё, твоё письмо загружено! ✨ Постарайся не потерять его, ладно? А то опять меня будешь дёргать.`,
      ]

      const randomMsg = snarkyMessages[Math.floor(Math.random() * snarkyMessages.length)]

      setIsOpen(true)
      setMessages((prev) => [...prev, { role: 'model', content: randomMsg }])
      hapticMedium()
    }

    window.addEventListener('ai_chat_new_letter', handleNewLetter)
    return () => window.removeEventListener('ai_chat_new_letter', handleNewLetter)
  }, [])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isLoading, isOpen])

  if (!session) return null // Hide if not authenticated

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedFile({
        name: file.name,
        dataUrl: event.target?.result as string,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return
    hapticLight()

    let userMessage = input.trim()
    if (selectedFile) {
      userMessage = userMessage
        ? `${userMessage}\n\n[Прикреплен файл: ${selectedFile.name}]`
        : `[Прикреплен файл: ${selectedFile.name}]`
    }

    setInput('')
    const filePayload = selectedFile?.dataUrl
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          fileData: filePayload,
        }),
      })

      if (!res.ok) {
        let errorMsg = 'Неизвестная ошибка'
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch (e) {}
        setMessages((prev) => [
          ...prev,
          { role: 'model', content: 'К сожалению, произошла ошибка: ' + errorMsg },
        ])
        return
      }

      setMessages((prev) => [...prev, { role: 'model', content: '' }])

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let done = false
        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            setMessages((prev) => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].content += chunk
              return newMsgs
            })
          }
        }
      }
      hapticMedium()
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Ошибка сети. Проверьте подключение.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              hapticMedium()
              setIsOpen(true)
            }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-emerald-400 text-white shadow-xl shadow-teal-500/30 ring-4 ring-slate-900 transition-all hover:shadow-teal-500/50 hover:ring-slate-800"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 999999,
              transformOrigin: 'bottom right',
            }}
          >
            <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white/20 bg-slate-900">
              <Image src="/grok_avatar.png" alt="Grok Chan" fill className="object-cover" />
            </div>
            <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 shadow-sm ring-2 ring-slate-900" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-40%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-40%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/50 backdrop-blur-xl"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              zIndex: 999999,
              width: 'min(400px, calc(100vw - 32px))',
              height: 'min(600px, calc(100vh - 48px))',
              transformOrigin: 'center',
            }}
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-teal-500/10 to-emerald-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 shadow-inner">
                  <Image src="/grok_avatar.png" alt="Grok Chan" fill className="object-cover" />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-white">Grok-тян 🌸</h3>
                  <p className="text-[11px] font-medium text-teal-400">Настроение: вредное 💅</p>
                </div>
              </div>
              <button
                onClick={() => {
                  hapticLight()
                  setIsOpen(false)
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div
              ref={scrollContainerRef}
              className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 flex-1 space-y-4 overflow-y-auto p-4"
            >
              {messages.map((m, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      m.role === 'user'
                        ? 'rounded-tr-sm bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                        : 'rounded-tl-sm border border-white/5 bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    {m.role === 'model' ? (
                      <div className="prose prose-sm prose-invert prose-p:leading-relaxed prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-white/5 max-w-none">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-white/5 bg-slate-800/80 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                    <span className="text-xs font-medium text-slate-400">Генерирует ответ...</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="scrollbar-none flex gap-2 overflow-x-auto border-t border-white/5 bg-slate-900/80 px-4 py-2">
              <button
                onClick={() => setInput('Есть ли у меня просроченные задачи?')}
                className="whitespace-nowrap rounded-full border border-teal-500/20 bg-slate-800 px-3 py-1.5 text-xs text-teal-400 transition-colors hover:bg-slate-700"
              >
                🔥 Мои просрочки
              </button>
              <button
                onClick={() => setInput('Покажи последние письма')}
                className="whitespace-nowrap rounded-full border border-teal-500/20 bg-slate-800 px-3 py-1.5 text-xs text-teal-400 transition-colors hover:bg-slate-700"
              >
                📄 Последние письма
              </button>
              <button
                onClick={() => setInput('Что мне сейчас делать?')}
                className="whitespace-nowrap rounded-full border border-teal-500/20 bg-slate-800 px-3 py-1.5 text-xs text-teal-400 transition-colors hover:bg-slate-700"
              >
                🎯 Что делать?
              </button>
            </div>

            {/* Input Area */}
            <div className="flex flex-col gap-2 border-t border-white/5 bg-slate-900/50 p-3 backdrop-blur-md">
              {selectedFile && (
                <div className="flex items-center justify-between rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-2">
                  <span className="max-w-[200px] truncate text-xs text-teal-400">
                    📎 {selectedFile.name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="relative flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Спросите меня о письмах..."
                    disabled={isLoading}
                    className="w-full rounded-xl border border-white/10 bg-slate-800/50 py-3 pl-4 pr-12 text-sm text-white placeholder-slate-400 shadow-inner transition-all focus:border-teal-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/50 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedFile) || isLoading}
                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white shadow-md transition-all hover:bg-teal-400 hover:shadow-teal-500/25 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
                  >
                    <Send className="h-4 w-4 translate-x-[1px]" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
