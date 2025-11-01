'use client'

import { useState } from 'react'
import Link from 'next/link'
import { apiCall } from '../../lib/api'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loginError, setLoginError] = useState('')
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('') // Clear previous errors

    if (isLogin) {
      // Handle login via API
      try {
        const response = await apiCall('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(loginData),
        })

        const result = await response.json()

        if (response.ok) {
          localStorage.setItem('loggedInUserEmail', result.user.email) // Store logged-in email
          if (result.user.role === 'admin') {
            window.location.href = '/admin-dashboard'
          } else {
            window.location.href = '/halls-dashboard'
          }
        } else {
          setLoginError(result.message || 'Login failed')
        }
      } catch (error) {
        console.error('Login fetch error:', error)
        setLoginError('An unexpected error occurred during login.')
      }
    } else {
      // Handle signup via API
      try {
        const response = await apiCall('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signupData),
        })

        const result = await response.json()

        if (response.ok) {
          alert('Signup successful!')
          // Automatically log in the user after successful signup
          localStorage.setItem('loggedInUserEmail', result.user.email) // Store signed-up email
          window.location.href = '/halls-dashboard' // Redirect to halls dashboard page after signup
        } else {
          setLoginError(result.message || 'Signup failed')
        }
      } catch (error) {
        console.error('Signup fetch error:', error)
        setLoginError('An unexpected error occurred during signup.')
      }
    }
  }

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    })
  }

  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    })
  }

  const handleToggleForm = () => {
    setIsLogin(!isLogin);
    setLoginError(''); // Clear errors when switching forms
    // Optionally clear form data when switching, to avoid pre-filled fields
    setLoginData({ email: '', password: '' });
    setSignupData({ name: '', email: '', password: '', confirmPassword: '' });
    localStorage.removeItem('loggedInUserEmail'); // Clear logged-in user on form switch
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-40 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      <div className="w-full max-w-md">
        {/* Error Message */}
        {loginError && (
          <div className="text-gray-300 text-center mb-4 bg-red-900/20 px-4 py-2 rounded">
            {loginError}
          </div>
        )}
        
        {/* Form Card */}
        <div className="relative z-10 glass bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 animate-fade-in-up">
          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-6 font-serif gradient-text">
            {isLogin ? 'Login Form' : 'Signup Form'}
          </h1>
          
          {/* Tabs */}
          <div className="flex mb-6 bg-white/20 backdrop-blur-sm rounded-xl p-1 border border-white/30">
            <button
              onClick={() => handleToggleForm()}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                isLogin
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-transparent text-white hover:bg-white/20'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleToggleForm()}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 ${
                !isLogin
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-transparent text-white hover:bg-white/20'
              }`}
            >
              Signup
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={isLogin ? 'hidden' : ''}>
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={signupData.name}
                onChange={handleSignupInputChange}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/70 transition-all duration-300 hover:bg-white/30"
              />
            </div>
            
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={isLogin ? loginData.email : signupData.email}
                onChange={isLogin ? handleLoginInputChange : handleSignupInputChange}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/70 transition-all duration-300 hover:bg-white/30"
              />
            </div>
            
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={isLogin ? loginData.password : signupData.password}
                onChange={isLogin ? handleLoginInputChange : handleSignupInputChange}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/70 transition-all duration-300 hover:bg-white/30"
              />
            </div>
            
            <div className={isLogin ? 'hidden' : ''}>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={signupData.confirmPassword}
                onChange={handleSignupInputChange}
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/70 transition-all duration-300 hover:bg-white/30"
              />
            </div>
            
            <div className={!isLogin ? 'hidden' : ''}>
              <Link href="/forgot-password" className="text-blue-300 hover:text-blue-100 text-sm transition-colors duration-300">
                Forgot password?
              </Link>
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              {isLogin ? 'Login' : 'Signup'}
            </button>
          </form>
          
          {/* Signup/Login Prompt */}
          <div className="text-center mt-6">
            {!isLogin && (
              <p className="text-white/80">
                Already have an account?{' '}
                <button
                  onClick={() => handleToggleForm()}
                  className="text-blue-300 hover:text-blue-100 font-medium transition-colors duration-300"
                >
                  Login now
                </button>
              </p>
            )}
          </div>
          
          {/* Back to Home */}
          <div className="text-center mt-4">
            <Link href="/" className="text-white/60 hover:text-white/80 text-sm transition-colors duration-300">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 
