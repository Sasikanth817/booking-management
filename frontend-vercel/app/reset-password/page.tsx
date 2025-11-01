'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiCall } from '../../lib/api'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.')
      return
    }

    // Verify token validity
    const verifyToken = async () => {
      try {
        const response = await apiCall('/api/auth/verify-reset-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        if (response.ok) {
          setTokenValid(true)
        } else {
          const data = await response.json()
          setError(data.message || 'Invalid or expired reset token.')
        }
      } catch (error) {
        setError('Failed to verify reset token.')
      }
    }

    verifyToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const response = await apiCall('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password reset successfully! Redirecting to login page...')
        setTimeout(() => {
          router.push('/auth')
        }, 2000)
      } else {
        setError(data.message || 'Failed to reset password.')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-black to-green-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
            <p className="text-gray-600 mb-6">This password reset link is invalid or has expired.</p>
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 font-medium">
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenValid && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-black to-green-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying reset token...</p>
          </div>
        </div>
      </div>
    )
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
            Reset Password
          </h1>
          
          <p className="text-gray-600 text-center mb-6">
            Enter your new password below.
          </p>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                name="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            
            <div>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
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
