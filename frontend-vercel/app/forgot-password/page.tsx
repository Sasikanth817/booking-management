'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiCall } from '../../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!email) {
      setError('Please enter your email address.')
      return
    }

    if (!email.endsWith('@cutmap.ac.in')) {
      setError('Please enter a valid @cutmap.ac.in email address.')
      return
    }

    setLoading(true)

    try {
      const response = await apiCall('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(data.message)
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmail = async () => {
    if (!email) {
      setError('Please enter an email address first.')
      return
    }

    setTestingEmail(true)
    setError('')
    setMessage('')

    try {
      const response = await apiCall('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Test email sent successfully! Check your inbox.')
      } else {
        setError(data.message)
      }
    } catch (error) {
      setError('Failed to send test email.')
    } finally {
      setTestingEmail(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-black to-green-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Message */}
        {message && (
          <div className="text-gray-300 text-center mb-4 bg-green-900/20 px-4 py-2 rounded">
            {message}
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="text-gray-300 text-center mb-4 bg-red-900/20 px-4 py-2 rounded">
            {error}
          </div>
        )}
        
        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Title */}
          <h1 className="text-2xl font-bold text-black text-center mb-6 font-serif">
            Forgot Password
          </h1>
          
          <p className="text-gray-600 text-center mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testingEmail || loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              {testingEmail ? 'Testing...' : 'Test Email Configuration'}
            </button>
          </form>
          
          {/* Back to Login */}
          <div className="text-center mt-6">
            <Link href="/auth" className="text-blue-600 hover:text-blue-800 font-medium">
              ← Back to Login
            </Link>
          </div>
          
          {/* Back to Home */}
          <div className="text-center mt-4">
            <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 
