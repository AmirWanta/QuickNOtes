import { useEffect, useRef, useState } from 'react'
import { getBotReply } from './api'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [documentText, setDocumentText] = useState('')
  const [topic, setTopic] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, isSending])

  const handleSend = async () => {
    const text = documentText.trim()
    const topicValue = topic.trim()
    if (!text || !topicValue || isSending) return

    setMessages((prev) => [...prev, { role: 'user', text: `Topic: ${topicValue}` }])
    setDocumentText('')
    setTopic('')
    setIsSending(true)

    try {
      const reply = await getBotReply(text, topicValue)
      setMessages((prev) => [...prev, { role: 'bot', text: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="chat">
      <h1 className="chat-title">QuickNotes</h1>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Ask me anything to get started.</p>
        )}
        {messages.map((message, i) => (
          <div key={i} className={`chat-bubble ${message.role}`}>
            {message.text}
          </div>
        ))}
        {isSending && <div className="chat-bubble bot pending">...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-textarea"
          placeholder="Paste your lecture here"
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          disabled={isSending}
        />
        <div className="chat-input-line">
          <input
            type="text"
            className="chat-input"
            placeholder="What topic do you want notes on?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isSending}
          />
          <button
            type="button"
            className="chat-send"
            onClick={handleSend}
            disabled={isSending || !documentText.trim() || !topic.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
