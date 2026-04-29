'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, Sparkles, MessageSquareText, Search } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { hapticLight, hapticMedium } from '@/lib/haptic'

type Message = {
  role: 'user' | 'model'
  content: string
}

export function AIChatWidget() {
  const { data: session } = useSession()
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    hapticLight()

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setMessages((prev) => [...prev, { role: 'model', content: data.reply }])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: 'К сожалению, произошла ошибка: ' + (data.error || 'Неизвестная ошибка'),
          },
        ])
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
            className="fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-emerald-400 text-white shadow-xl shadow-teal-500/30 ring-4 ring-slate-900 transition-shadow hover:shadow-teal-500/50"
          >
            <Sparkles className="h-6 w-6" />
            <span className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-slate-900" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-[100] flex h-[550px] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/50 backdrop-blur-xl"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-teal-500/10 to-emerald-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white shadow-inner">
                  <Bot className="h-5 w-5" />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500" />
                </div>
                <div>
                  <h3 className="font-semibold tracking-tight text-white">AI Ассистент</h3>
                  <p className="text-[11px] font-medium text-teal-400">Grok-2 RAG Engine</p>
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

            {/* Input Area */}
            <div className="border-t border-white/5 bg-slate-900/50 p-3 backdrop-blur-md">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Спросите меня о письмах..."
                  disabled={isLoading}
                  className="w-full rounded-2xl border border-white/10 bg-slate-800/50 py-3.5 pl-4 pr-12 text-sm text-white placeholder-slate-400 shadow-inner transition-all focus:border-teal-500/50 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500/50 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500 text-white shadow-md transition-all hover:bg-teal-400 hover:shadow-teal-500/25 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
                >
                  <Send className="h-4 w-4 translate-x-px translate-y-px" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
