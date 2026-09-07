import { useEffect, useRef, useState } from 'react'
import { getBotReply, getBotReplyFromPdf } from './api'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [documentText, setDocumentText] = useState('')
  const [topic, setTopic] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, isSending])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPdfFile(file)
    setDocumentText('')
  }

  const clearPdfFile = () => {
    setPdfFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSend = async () => {
    const text = documentText.trim()
    const topicValue = topic.trim()
    if ((!text && !pdfFile) || !topicValue || isSending) return

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: pdfFile ? `Topic: ${topicValue} (from ${pdfFile.name})` : `Topic: ${topicValue}` },
    ])
    const file = pdfFile
    setDocumentText('')
    setTopic('')
    clearPdfFile()
    setIsSending(true)

    try {
      const reply = file ? await getBotReplyFromPdf(file, topicValue) : await getBotReply(text, topicValue)
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
        {pdfFile ? (
          <div className="chat-pdf-chip">
            <span>{pdfFile.name}</span>
            <button type="button" onClick={clearPdfFile} disabled={isSending} aria-label="Remove PDF">
              &times;
            </button>
          </div>
        ) : (
          <textarea
            className="chat-textarea"
            placeholder="Paste your lecture here"
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            disabled={isSending}
          />
        )}
        <div className="chat-input-line">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="chat-file-input"
            id="pdf-upload"
            onChange={handleFileChange}
            disabled={isSending}
          />
          <label htmlFor="pdf-upload" className="chat-upload-button">
            Upload PDF
          </label>
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
            disabled={isSending || (!documentText.trim() && !pdfFile) || !topic.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
