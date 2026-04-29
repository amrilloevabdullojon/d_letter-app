'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSession } from 'next-auth/react'

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
        'Привет! Я AI-ассистент. Я могу найти для вас информацию по базе писем и ответить на вопросы. Чем могу помочь?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, isOpen])

  if (!session) return null // Hide if not authenticated

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

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
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-500/20 transition-all hover:scale-105 hover:bg-teal-500 active:scale-95 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <div
        className={`fixed bottom-6 right-6 z-[100] flex h-[500px] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl transition-all duration-300 ${
          isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-8 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-teal-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Ассистент</h3>
              <p className="text-xs text-slate-400">Поиск по базе писем</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'rounded-tr-sm bg-teal-600 text-white'
                    : 'rounded-tl-sm border border-slate-700 bg-slate-800 text-slate-200'
                }`}
              >
                {m.role === 'model' ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-800 bg-slate-900 p-3">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите что-нибудь..."
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-4 pr-12 text-sm text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
