'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { apiCall } from '../../lib/api'

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [activeHall, setActiveHall] = useState('') // Default active hall
  const [viewMode, setViewMode] = useState<'pending' | 'approved' | 'users' | 'allBookings' | 'halls'>('pending') // 'pending', 'approved', 'users', 'allBookings', or 'halls'
  const [users, setUsers] = useState<any[]>([])
  const [halls, setHalls] = useState<any[]>([])
  const [loadingHalls, setLoadingHalls] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [showHallForm, setShowHallForm] = useState(false)
  const [editingHall, setEditingHall] = useState<any>(null)
  const [hallFormData, setHallFormData] = useState({
    name: '',
    description: '',
    capacity: '',
    location: '',
    image: ''
  })
  
  // Get hall names from halls state
  const hallNames = halls.map(hall => hall.name)

  useEffect(() => {
    // Load bookings from API first, fallback to localStorage 
    const fetchBookings = async () => {
      try {
        const res = await apiCall('/api/bookings')
        if (res.ok) {
          const data = await res.json()
          // Normalize to include id field for UI code
          const normalized = (data.bookings || []).map((b: any) => ({
            id: b._id || b.id,
            ...b
          }))
          setBookings(normalized)
          localStorage.setItem('hallBookings', JSON.stringify(normalized))
        } else {
          throw new Error('Failed to fetch bookings')
        }
      } catch {
        const storedBookings = localStorage.getItem('hallBookings')
        if (storedBookings) setBookings(JSON.parse(storedBookings))
      }
    }
    fetchBookings()

    // Get current user's email from localStorage
    const loggedInEmail = localStorage.getItem('loggedInUserEmail') || ''
    setCurrentUserEmail(loggedInEmail)

    // Load users from API
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const response = await apiCall('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users)
          
          // Find current user details
          if (loggedInEmail) {
            const currentUser = data.users.find((user: any) => user.email === loggedInEmail)
            if (currentUser) {
              setCurrentUserName(currentUser.name)
            }
          }
    } else {
          console.error('Failed to fetch users')
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }

    fetchUsers()

    // Load halls from API
    const loadHalls = async () => {
      setLoadingHalls(true)
      try {
        const response = await apiCall('/api/halls')
        if (response.ok) {
          const data = await response.json()
          const fetchedHalls = data.halls || []
          setHalls(fetchedHalls)
          // Set first hall as active if available and no hall is currently active
          if (fetchedHalls.length > 0) {
            setActiveHall((prev) => prev || fetchedHalls[0].name)
          }
        } else {
          console.error('Failed to fetch halls')
        }
      } catch (error) {
        console.error('Error fetching halls:', error)
      } finally {
        setLoadingHalls(false)
      }
    }
    loadHalls()
  }, [])

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      // Update in DB first
      const patchRes = await apiCall('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      })
      if (!patchRes.ok) throw new Error('Failed to update booking status')

      // Refresh bookings from API
      const res = await apiCall('/api/bookings')
      if (res.ok) {
        const data = await res.json()
        const normalized = (data.bookings || []).map((b: any) => ({ id: b._id || b.id, ...b }))
        setBookings(normalized)
        localStorage.setItem('hallBookings', JSON.stringify(normalized))
      }

      // Email notification to user
      const changedBooking = bookings.find(booking => booking.id === id)
      if (changedBooking) {
        try {
          const response = await apiCall('/api/send-booking-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: id,
              newStatus,
              userEmail: changedBooking.email,
              bookingDetails: changedBooking,
            }),
          })
          if (!response.ok) console.error('Failed to send user notification.', response.statusText)
        } catch (error) {
          console.error('Error sending user notification:', error)
        }
      }
    } catch (e) {
      console.error(e)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('loggedInUserEmail')
    // Redirect to login page
    window.location.href = '/auth'
  }

  const refreshUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await apiCall('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleHallFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingHall ? '/api/halls' : '/api/halls'
      const method = editingHall ? 'PUT' : 'POST'
      const body = editingHall 
        ? { ...hallFormData, id: editingHall.id }
        : hallFormData

      const response = await apiCall(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (response.ok) {
        alert(editingHall ? 'Hall updated successfully!' : 'Hall created successfully!')
        setShowHallForm(false)
        setEditingHall(null)
        setHallFormData({ name: '', description: '', capacity: '', location: '', image: '' })
        // Refresh halls list
        const refreshResponse = await fetch('/api/halls')
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          const fetchedHalls = refreshData.halls || []
          setHalls(fetchedHalls)
        }
      } else {
        alert(result.message || 'Failed to save hall. Please try again.')
      }
    } catch (error) {
      console.error('Error saving hall:', error)
      alert('An error occurred. Please try again.')
    }
  }

  const handleEditHall = (hall: any) => {
    setEditingHall(hall)
    setHallFormData({
      name: hall.name,
      description: hall.description,
      capacity: hall.capacity,
      location: hall.location,
      image: hall.image || ''
    })
    setShowHallForm(true)
  }

  const handleAddHall = () => {
    setEditingHall(null)
    setHallFormData({ name: '', description: '', capacity: '', location: '', image: '' })
    setShowHallForm(true)
  }

  const handleDeleteHall = async (hallId: string) => {
    if (!confirm('Are you sure you want to delete this hall? This action cannot be undone.')) {
      return
    }

    try {
      const response = await apiCall(`/api/halls?id=${hallId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Hall deleted successfully!')
        // Refresh halls list
        const refreshResponse = await fetch('/api/halls')
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          const fetchedHalls = refreshData.halls || []
          setHalls(fetchedHalls)
          // Clear active hall if it was deleted
          setActiveHall((prev) => {
            const stillExists = fetchedHalls.some((h: any) => h.name === prev)
            return stillExists ? prev : (fetchedHalls[0]?.name || '')
          })
        }
      } else {
        const result = await response.json()
        alert(result.message || 'Failed to delete hall. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting hall:', error)
      alert('An error occurred. Please try again.')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showProfileDropdown && !target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showProfileDropdown])

  const pendingBookings = bookings.filter(booking => booking.status === 'pending' && booking.hallName === activeHall)
  const approvedBookings = bookings.filter(booking => booking.status === 'approved')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Industrial Header */}
      <header className="bg-gradient-to-r from-slate-800 via-gray-800 to-slate-700 shadow-2xl border-b-2 border-brown-500/30 px-6 py-4 relative overflow-visible z-40">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-brown-400/20 via-transparent to-brown-400/20 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center space-x-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-brown-500 to-beige-500 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <div className="relative z-10 bg-slate-800 p-2 rounded-full border-2 border-brown-500/50">
                <img 
                  src='/halls/Hall Logo.png' 
                  height={"40"} 
                  width={"40"}
                  className="transition-transform duration-300 group-hover:scale-110"
                  alt="HALL MATE Logo"
                />
              </div>
            </div>
            <div className="text-xl font-bold">
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-brown-300 via-beige-400 to-brown-500 animate-pulse">
                HallMate
              </div>
              <div className="text-slate-300 text-sm font-medium tracking-wider">
                Management System
              </div>
            </div>
          </div>
          
          {/* Industrial Profile Icon with Dropdown */}
          <div className="relative z-50 profile-dropdown-container">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="relative z-50 group bg-slate-700/50 hover:bg-slate-600/70 p-3 rounded-lg border border-brown-500/30 hover:border-brown-400/60 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brown-500/50"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brown-500/10 to-beige-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-brown-400 group-hover:text-brown-300 transition-colors duration-300 relative z-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* Industrial Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-3 w-96 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl z-50 border border-brown-500/30 overflow-hidden backdrop-blur-lg animate-in slide-in-from-top-2 duration-300">
                {/* User Info Section */}
                <div className="bg-gradient-to-r from-brown-600 via-brown-500 to-brown-600 px-6 py-6 text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-brown-500/20 to-beige-500/20 animate-pulse"></div>
                  <div className="relative z-10">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-7 h-7">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">{currentUserName || 'System Administrator'}</h3>
                        <p className="text-beige-300 text-sm font-medium">HallMate</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-beige-300">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0z" />
                        </svg>
                        <span className="font-medium">{currentUserEmail}</span>
                      </div>
                      <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-beige-300">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        <span className="font-medium">System Administrator</span>
                      </div>
                      <div className="border-t border-brown-400/30 pt-3 mt-3">
                        <div className="flex items-center space-x-3 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-beige-300">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3M18 9v3m0 0v3m0-3h3m-3 0h-3" />
                          </svg>
                          <span className="font-medium">Centurion University, Vizianagaram</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Links Section */}
                <div className="py-3 bg-slate-800/50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-6 py-4 text-sm text-slate-300 hover:text-red-400 hover:bg-red-500/10 focus:outline-none focus:bg-red-500/10 flex items-center space-x-4 transition-all duration-300 group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors duration-300">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    <span className="text-red-500 group-hover:text-red-400 font-medium transition-colors duration-300">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
      {/* Industrial Sidebar */}
      <aside className="w-72 bg-neutral-900 text-white flex flex-col border-r border-brown-500/20 shadow-2xl">
        <div className="p-6 text-2xl font-bold border-b border-brown-500/30 bg-neutral-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <span className="text-cyan-300">CONTROL PANEL</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-3">
          <h3 className="text-cyan-400 uppercase tracking-wider text-sm font-bold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-2 text-cyan-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            FACILITY MANAGEMENT
          </h3>
          {hallNames.length > 0 ? (
            hallNames.map((hallName, index) => (
              <button
                key={hallName}
                onClick={() => { setActiveHall(hallName); setViewMode('pending'); }}
                className={`w-full text-left py-4 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                  activeHall === hallName && viewMode === 'pending' 
                    ? 'bg-gradient-to-r from-brown-600 to-brown-500 text-white shadow-lg shadow-brown-500/25 border border-brown-400/50' 
                    : 'hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent hover:border-brown-500/30'
                }`}
              >
              <div className={`absolute inset-0 bg-gradient-to-r from-brown-500/10 to-beige-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                activeHall === hallName && viewMode === 'pending' ? 'opacity-100' : ''
              }`}></div>
              <div className="relative z-10 flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeHall === hallName && viewMode === 'pending' 
                    ? 'bg-white animate-pulse' 
                    : 'bg-brown-500 group-hover:bg-brown-400'
                }`}></div>
                <span className="font-medium">{hallName}</span>
                {activeHall === hallName && viewMode === 'pending' && (
                  <div className="ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
            ))
          ) : (
            <div className="py-4 px-4 text-sm text-slate-400 text-center">
              {loadingHalls ? 'Loading halls...' : 'No halls available. Add halls in Hall Management.'}
            </div>
          )}
          
          <div className="border-t border-slate-700/50 pt-4 mt-6">
            <h3 className="text-cyan-400 uppercase tracking-wider text-sm font-bold mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-2 text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              SYSTEM OPERATIONS
            </h3>
            
            <button
              onClick={() => setViewMode('approved')}
              className={`w-full text-left py-4 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden mb-3 ${
                viewMode === 'approved' 
                  ? 'bg-gradient-to-r from-brown-600 to-brown-500 text-white shadow-lg shadow-brown-500/25 border border-brown-400/50' 
                  : 'hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent hover:border-brown-500/30'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-brown-500/10 to-beige-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                viewMode === 'approved' ? 'opacity-100' : ''
              }`}></div>
              <div className="relative z-10 flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  viewMode === 'approved' 
                    ? 'bg-white animate-pulse' 
                    : 'bg-brown-500 group-hover:bg-brown-400'
                }`}></div>
                <span className="font-medium">Approved Bookings</span>
                {viewMode === 'approved' && (
                  <div className="ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setViewMode('allBookings')}
              className={`w-full text-left py-4 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden mb-3 ${
                viewMode === 'allBookings' 
                  ? 'bg-gradient-to-r from-brown-600 to-brown-500 text-white shadow-lg shadow-brown-500/25 border border-brown-400/50' 
                  : 'hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent hover:border-brown-500/30'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-brown-500/10 to-beige-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                viewMode === 'allBookings' ? 'opacity-100' : ''
              }`}></div>
              <div className="relative z-10 flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  viewMode === 'allBookings' 
                    ? 'bg-white animate-pulse' 
                    : 'bg-brown-500 group-hover:bg-brown-400'
                }`}></div>
                <span className="font-medium">All Bookings</span>
                {viewMode === 'allBookings' && (
                  <div className="ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setViewMode('users')}
              className={`w-full text-left py-4 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden mb-3 ${
                viewMode === 'users' 
                  ? 'bg-gradient-to-r from-brown-600 to-brown-500 text-white shadow-lg shadow-brown-500/25 border border-brown-400/50' 
                  : 'hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent hover:border-brown-500/30'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-brown-500/10 to-beige-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                viewMode === 'users' ? 'opacity-100' : ''
              }`}></div>
              <div className="relative z-10 flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  viewMode === 'users' 
                    ? 'bg-white animate-pulse' 
                    : 'bg-brown-500 group-hover:bg-brown-400'
                }`}></div>
                <span className="font-medium">User Management</span>
                {viewMode === 'users' && (
                  <div className="ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => setViewMode('halls')}
              className={`w-full text-left py-4 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                viewMode === 'halls' 
                  ? 'bg-gradient-to-r from-brown-600 to-brown-500 text-white shadow-lg shadow-brown-500/25 border border-brown-400/50' 
                  : 'hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent hover:border-brown-500/30'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-brown-500/10 to-beige-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                viewMode === 'halls' ? 'opacity-100' : ''
              }`}></div>
              <div className="relative z-10 flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  viewMode === 'halls' 
                    ? 'bg-white animate-pulse' 
                    : 'bg-brown-500 group-hover:bg-brown-400'
                }`}></div>
                <span className="font-medium">Hall Management</span>
                {viewMode === 'halls' && (
                  <div className="ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 animate-pulse">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 bg-white">
        {/* Dashboard Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Bookings Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-brown-500/20 shadow-2xl hover:shadow-brown-500/10 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brown-500/5 to-beige-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-brown-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{bookings.length}</div>
                  <div className="text-sm text-slate-400">Total Bookings</div>
                </div>
              </div>
              <div className="flex items-center text-sm text-brown-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
                <span className="font-medium">All Time</span>
              </div>
            </div>
          </div>

          {/* Pending Bookings Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-brown-500/20 shadow-2xl hover:shadow-brown-500/10 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brown-500/5 to-beige-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{bookings.filter(b => b.status === 'pending').length}</div>
                  <div className="text-sm text-slate-400">Pending</div>
                </div>
              </div>
              <div className="flex items-center text-sm text-brown-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1 animate-pulse">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="font-medium">Awaiting Review</span>
              </div>
            </div>
          </div>

          {/* Approved Bookings Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-brown-500/20 shadow-2xl hover:shadow-brown-500/10 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brown-500/5 to-beige-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{bookings.filter(b => b.status === 'approved').length}</div>
                  <div className="text-sm text-slate-400">Approved</div>
                </div>
              </div>
              <div className="flex items-center text-sm text-brown-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
                <span className="font-medium">Confirmed</span>
              </div>
            </div>
          </div>

          {/* Total Users Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-brown-500/20 shadow-2xl hover:shadow-brown-500/10 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brown-500/5 to-beige-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.016A7.5 7.5 0 0118 12a7.5 7.5 0 00-3-5.999M15 19.128c0 1.113-.285 2.16-.786 3.07m0 0a9.337 9.337 0 01-4.121.952 4.125 4.125 0 01-7.533-2.493m0 0A9.337 9.337 0 0112 21a9.38 9.38 0 002.625-.372m0 0a9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493m0 0A9.337 9.337 0 0112 21a9.38 9.38 0 002.625-.372" />
                  </svg>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{users.length}</div>
                  <div className="text-sm text-slate-400">Total Users</div>
                </div>
              </div>
              <div className="flex items-center text-sm text-brown-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.016A7.5 7.5 0 0118 12a7.5 7.5 0 00-3-5.999M15 19.128c0 1.113-.285 2.16-.786 3.07m0 0a9.337 9.337 0 01-4.121.952 4.125 4.125 0 01-7.533-2.493m0 0A9.337 9.337 0 0112 21a9.38 9.38 0 002.625-.372m0 0a9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493m0 0A9.337 9.337 0 0112 21a9.38 9.38 0 002.625-.372" />
                </svg>
                <span className="font-medium">Registered</span>
              </div>
            </div>
          </div>
        </div>
        {viewMode === 'pending' && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brown-300 to-brown-500 mb-2">
                {activeHall || 'Select a Hall'}
              </h1>
              <p className="text-slate-400 text-lg">Pending Booking Requests</p>
            </div>
            
            {!activeHall ? (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-brown-500/20 overflow-hidden">
                <div className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-300">Please Select a Hall</h3>
                      <p className="text-slate-500 text-sm">Click on a hall from the sidebar to view its pending bookings</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-brown-500/20 overflow-hidden">
                <div className="bg-gradient-to-r from-brown-600/20 to-brown-500/20 px-6 py-4 border-b border-brown-500/30">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 mr-3 text-brown-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Awaiting Administrative Review
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Booking ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          User Email
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Event Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {pendingBookings.length > 0 ? (
                        pendingBookings.map((booking, index) => (
                        <tr key={booking.id} className="hover:bg-slate-700/30 transition-all duration-300 group">
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-brown-500 rounded-full mr-3 animate-pulse"></div>
                              <span className="font-mono text-xs">{booking.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.bookingDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.bookingTime}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="font-medium">{booking.eventName}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleStatusChange(booking.id, 'approved')}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 flex items-center space-x-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleStatusChange(booking.id, 'rejected')}
                                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 flex items-center space-x-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-slate-300">No Pending Bookings</h3>
                              <p className="text-slate-500 text-sm">No pending bookings found for {activeHall}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </>
        )}

        {viewMode === 'approved' && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brown-300 to-brown-500 mb-2">
                Approved Bookings
              </h1>
              <p className="text-slate-400 text-lg">Confirmed Reservations</p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-brown-500/20 overflow-hidden">
              <div className="bg-gradient-to-r from-brown-600/20 to-brown-500/20 px-6 py-4 border-b border-brown-500/30">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 mr-3 text-brown-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                  Confirmed Reservations
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Booking ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        User Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Event Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {approvedBookings.length > 0 ? (
                      approvedBookings.map(booking => (
                        <tr key={booking.id} className="hover:bg-slate-700/30 transition-all duration-300 group">
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                              <span className="font-mono text-xs">{booking.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.bookingDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.bookingTime}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="font-medium">{booking.eventName}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                              {booking.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-slate-300">No Approved Bookings</h3>
                              <p className="text-slate-500 text-sm">No approved bookings found</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {viewMode === 'allBookings' && (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brown-300 to-brown-500 mb-2">
                All Bookings
              </h1>
              <p className="text-slate-400 text-lg">Complete Booking Overview</p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-brown-500/20 overflow-hidden">
              <div className="bg-gradient-to-r from-brown-600/20 to-brown-500/20 px-6 py-4 border-b border-brown-500/30">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 mr-3 text-brown-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                  </svg>
                  Complete Booking Database
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Booking ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Hall Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        User Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Time
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Event Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {bookings.length > 0 ? (
                      bookings.map(booking => (
                        <tr key={booking.id} className="hover:bg-slate-700/30 transition-all duration-300 group">
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-3 ${
                                booking.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                                booking.status === 'approved' ? 'bg-brown-500' : 'bg-red-500'
                              }`}></div>
                              <span className="font-mono text-xs">{booking.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.hallName}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.bookingDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {booking.bookingTime}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="font-medium">{booking.eventName}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                              booking.status === 'pending' 
                                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
                                : booking.status === 'approved'
                                ? 'bg-brown-500/20 text-brown-400 border-brown-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                booking.status === 'pending' ? 'bg-yellow-400 animate-pulse' :
                                booking.status === 'approved' ? 'bg-brown-400' : 'bg-red-400'
                              }`}></div>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {booking.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleStatusChange(booking.id, 'approved')}
                                  className="bg-gradient-to-r from-brown-600 to-brown-500 hover:from-brown-700 hover:to-brown-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-brown-500/25 flex items-center space-x-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                  </svg>
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleStatusChange(booking.id, 'rejected')}
                                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25 flex items-center space-x-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-sm font-medium">{booking.status}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-slate-300">No Bookings Found</h3>
                              <p className="text-slate-500 text-sm">No bookings have been created yet</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {viewMode === 'users' && (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brown-300 to-brown-500 mb-2">
                    User Management
                  </h1>
                  <p className="text-slate-400 text-lg">System User Database</p>
                </div>
                <button
                  onClick={refreshUsers}
                  disabled={loadingUsers}
                  className="bg-gradient-to-r from-brown-600 to-brown-500 hover:from-brown-700 hover:to-brown-600 disabled:from-brown-400 disabled:to-brown-300 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-3 transform hover:scale-105 hover:shadow-lg hover:shadow-brown-500/25 disabled:transform-none disabled:shadow-none"
                >
                  {loadingUsers ? (
                    <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  )}
                  <span>{loadingUsers ? 'Loading...' : 'Refresh Users'}</span>
                </button>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-brown-500/20 overflow-hidden">
              <div className="bg-gradient-to-r from-brown-600/20 to-brown-500/20 px-6 py-4 border-b border-brown-500/30">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 mr-3 text-brown-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.016A7.5 7.5 0 0118 12a7.5 7.5 0 00-3-5.999M15 19.128c0 1.113-.285 2.16-.786 3.07m0 0a9.337 9.337 0 01-4.121.952 4.125 4.125 0 01-7.533-2.493m0 0A9.337 9.337 0 0112 21a9.38 9.38 0 002.625-.372m0 0a9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493m0 0A9.337 9.337 0 0112 21a9.38 9.38 0 002.625-.372" />
                  </svg>
                  Registered Users Database
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        User ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                        Role
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                              <svg className="animate-spin w-8 h-8 text-brown-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-slate-300">Loading Users...</h3>
                              <p className="text-slate-500 text-sm">Please wait while we fetch user data</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : users.length > 0 ? (
                      users.map(user => (
                        <tr key={user.id} className="hover:bg-slate-700/30 transition-all duration-300 group">
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-brown-500 rounded-full mr-3"></div>
                              <span className="font-mono text-xs">{user.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="font-medium">{user.name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                              user.role === 'admin' 
                                ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                : 'bg-brown-500/20 text-brown-400 border-brown-500/30'
                            }`}>
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                user.role === 'admin' ? 'bg-red-400' : 'bg-brown-400'
                              }`}></div>
                              {user.role}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-slate-300">No Users Found</h3>
                              <p className="text-slate-500 text-sm">No users have been registered yet</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {viewMode === 'halls' && (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brown-300 to-brown-500 mb-2">
                    Hall Management
                  </h1>
                  <p className="text-slate-400 text-lg">Manage Hall Specifications</p>
                </div>
                <button
                  onClick={handleAddHall}
                  className="bg-gradient-to-r from-brown-600 to-brown-500 hover:from-brown-700 hover:to-brown-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-3 transform hover:scale-105 hover:shadow-lg hover:shadow-brown-500/25"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Add New Hall</span>
                </button>
              </div>
            </div>

            {/* Hall Form Modal */}
            {showHallForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-brown-500/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="bg-gradient-to-r from-brown-600/20 to-brown-500/20 px-6 py-4 border-b border-brown-500/30 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                      {editingHall ? 'Update Hall' : 'Add New Hall'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowHallForm(false)
                        setEditingHall(null)
                        setHallFormData({ name: '', description: '', capacity: '', location: '', image: '' })
                      }}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <form onSubmit={handleHallFormSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Hall Name *</label>
                      <input
                        type="text"
                        required
                        value={hallFormData.name}
                        onChange={(e) => setHallFormData({ ...hallFormData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brown-500"
                        placeholder="e.g., Gallery Hall 1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Description *</label>
                      <textarea
                        required
                        value={hallFormData.description}
                        onChange={(e) => setHallFormData({ ...hallFormData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brown-500"
                        placeholder="Describe the hall, its features, and uses..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Capacity *</label>
                        <input
                          type="text"
                          required
                          value={hallFormData.capacity}
                          onChange={(e) => setHallFormData({ ...hallFormData, capacity: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brown-500"
                          placeholder="e.g., 100-120 people"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Location *</label>
                        <input
                          type="text"
                          required
                          value={hallFormData.location}
                          onChange={(e) => setHallFormData({ ...hallFormData, location: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brown-500"
                          placeholder="e.g., Block C, 1st Floor"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Image URL (Optional)</label>
                      <input
                        type="text"
                        value={hallFormData.image}
                        onChange={(e) => setHallFormData({ ...hallFormData, image: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brown-500"
                        placeholder="e.g., /halls/Galleryhall1.jpg"
                      />
                    </div>

                    <div className="flex space-x-4 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-brown-600 to-brown-500 hover:from-brown-700 hover:to-brown-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
                      >
                        {editingHall ? 'Update Hall' : 'Create Hall'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowHallForm(false)
                          setEditingHall(null)
                          setHallFormData({ name: '', description: '', capacity: '', location: '', image: '' })
                        }}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-brown-500/20 overflow-hidden">
              <div className="bg-gradient-to-r from-brown-600/20 to-brown-500/20 px-6 py-4 border-b border-brown-500/30">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 mr-3 text-brown-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
                  </svg>
                  Hall Specifications Database
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                {loadingHalls ? (
                  <div className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                        <svg className="animate-spin w-8 h-8 text-brown-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-300">Loading Halls...</h3>
                        <p className="text-slate-500 text-sm">Please wait while we fetch hall data</p>
                      </div>
                    </div>
                  </div>
                ) : halls.length > 0 ? (
                  <table className="min-w-full">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Hall Name
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Description
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Capacity
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Location
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-brown-400 uppercase tracking-wider border-b border-slate-600/50">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {halls.map(hall => (
                        <tr key={hall.id} className="hover:bg-slate-700/30 transition-all duration-300 group">
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="font-medium">{hall.name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            <div className="max-w-md">{hall.description}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {hall.capacity}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 group-hover:text-white transition-colors duration-300">
                            {hall.location}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditHall(hall)}
                                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteHall(hall.id)}
                                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 text-slate-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-300">No Halls Found</h3>
                        <p className="text-slate-500 text-sm">Click "Add New Hall" to create your first hall</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </main>
      </div>
    </div>
  )
}
