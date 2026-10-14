import React, { useState, useEffect } from 'react'
import api, { ChatRequest, ChatResponse } from './api'

function App() {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<ChatResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<string | null>(null)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.health()
        setHealthStatus(res.status)
      } catch (e) {
        setHealthStatus('unhealthy')
        console.error('Health check failed', e)
      }
    }
    checkHealth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    setError(null)
    const request: ChatRequest = {
      message,
      // For demo, we can generate a random user_id or session_id, or leave undefined
      user_id: Math.random().toString(36).substring(2, 10),
      session_id: Math.random().toString(36).substring(2, 10),
    }

    try {
      const response: ChatResponse = await api.chat(request)
      setHistory(prev => [response, ...prev])
      setMessage('')
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
  }

  if (healthStatus === 'unhealthy') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Backend Unhealthy</h1>
          <p className="mt-2">Please ensure the backend is running on http://localhost:8000</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800">Hyperion AI Security Gateway</h1>
          <p className="mt-1 text-gray-600">Your messages are scanned for sensitive information before being processed.</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Your Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={4}
                disabled={loading}
              ></textarea>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading || !message.trim()}
                className={`px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                  loading ? 'cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
              <button
                type="button"
                onClick={clearHistory}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                disabled={history.length === 0}
              >
                Clear History
              </button>
            </div>
          </form>
        </div>

        {history.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Chat History</h2>
            <div className="space-y-4">
              {history.map((msg, index) => (
                <div key={index} className="border-t pt-4 first:border-t-0 first:pt-0">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      <strong>AI Response:</strong> {msg.response}
                    </p>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        msg.security_action === 'allow'
                          ? 'bg-green-100 text-green-800'
                          : msg.security_action === 'mask'
                          ? 'bg-yellow-100 text-yellow-800'
                          : msg.security_action === 'block'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {msg.security_action}
                      </span>
                      <span className="text-gray-500">|</span>
                      <span className="text-gray-500">{msg.explanation}</span>
                      {msg.incident_id && (
                        <>
                          <span className="text-gray-500">|</span>
                          <span className="text-gray-500 text-xs">Incident: {msg.incident_id}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
