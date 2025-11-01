'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AvailabilityPage from '../availability/page'
import { apiCall } from '../../lib/api'

// Halls data for the carousel
const hallsData = [
  {
    id: 1,
    name: 'Gallery Hall 1',
    description: 'A spacious hall ideal for large exhibitions and conferences, with modern audio-visual equipment. Located in Block C, 1st Floor, Capacity: 100-120 people.',
    image: '/halls/Galleryhall1.jpg',
  },
  {
    id: 2,
    name: 'Gallery Hall 2',
    description: 'Perfect for medium-sized events, seminars, and workshops. Equipped with comfortable seating. Located in Block C, 1st Floor, Capacity: 100-120 people.',
    image: '/halls/Galleryhall2.jpg',
  },
  {
    id: 3,
    name: 'Board Room',
    description: 'Small and cozy, suitable for private meetings, presentations, and small gatherings. Located in Block B, Ground Floor, Capacity: 30-50 people.',
    image: '/halls/Board room.jpg',
  },
  {
    id: 4,
    name: 'B 05',
    description: 'A large, state-of-the-art conference hall with multiple projectors and seating for up to 200. Ideal for major university events. Located in Main Building, 2nd Floor.',
    image: '/halls/B 05.jpg',
  },
] // Import the new AvailabilityPage

export default function HallsDashboardPage() {
  const [showAvailabilityInterface, setShowAvailabilityInterface] = useState(false)
  const [showMyBookings, setShowMyBookings] = useState(false)
  const [myBookings, setMyBookings] = useState<any[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Open My Bookings if query param present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'my-bookings') {
        setShowMyBookings(true)
        setShowAvailabilityInterface(false)
      }
    }
  }, [])

  useEffect(() => {
    // Get current user's email from localStorage
    const loggedInEmail = localStorage.getItem('loggedInUserEmail') || ''
    setCurrentUserEmail(loggedInEmail)
    
    // Fetch user details from API
    const fetchUserDetails = async () => {
      if (loggedInEmail) {
        try {
          const response = await apiCall('/api/users')
          if (response.ok) {
            const data = await response.json()
            const currentUser = data.users.find((user: any) => user.email === loggedInEmail)
            if (currentUser) {
              setCurrentUserName(currentUser.name)
            }
          }
        } catch (error) {
          console.error('Error fetching user details:', error)
        }
      }
    }
    
    fetchUserDetails()
  }, []) // Empty dependency array, runs once on mount to get initial email

  // Auto-change carousel image every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % hallsData.length)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const loadUserBookings = async () => {
      if (!currentUserEmail) {
        setMyBookings([])
        return
      }
      try {
        // Try API first
        const res = await apiCall(`/api/bookings?userEmail=${encodeURIComponent(currentUserEmail)}`)
        if (res.ok) {
          const data = await res.json()
          const normalized = (data.bookings || []).map((b: any) => ({ id: b._id || b.id, ...b }))
          setMyBookings(normalized)
          return
        }
        throw new Error('Failed to fetch from API')
      } catch {
        // Fallback to localStorage
        const stored = localStorage.getItem('hallBookings')
        if (stored) {
          const all = JSON.parse(stored)
          const mine = all.filter((booking: any) => {
            const bEmail = booking.userEmail || booking.email
            return bEmail && bEmail === currentUserEmail
          })
          setMyBookings(mine)
        } else {
          setMyBookings([])
        }
      }
    }
    loadUserBookings()
  }, [currentUserEmail])

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('loggedInUserEmail')
    // Redirect to login page
    window.location.href = '/auth'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans flex flex-col relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      {/* Header */}
      <header className="relative z-50 flex justify-between items-center px-8 py-4 backdrop-blur-lg bg-white/80 shadow-lg border-b border-white/20">
        <div className="flex items-center space-x-4 group">
          {/* Logo - Reusing the small logo structure from the original image */}
         <div className="transform transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
            <img src='/halls/Hall Logo.png' height={"50"} width={"50"} className="drop-shadow-lg"></img>
          </div>
          <div className="text-lg font-semibold">
            <div className="text-gray-800 transform transition-all duration-300 group-hover:text-blue-600">HALL</div>
            <div className="text-gray-600 transform transition-all duration-300 group-hover:text-blue-600">MATE</div>
          </div>
        </div>
        <nav className="flex items-center space-x-6">
          <button
            onClick={() => { setShowMyBookings(false); setShowAvailabilityInterface(false); }}
            className={`text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 transform hover:scale-105`}
          >
            Home
          </button>

          <button
            onClick={() => { setShowMyBookings(false); setShowAvailabilityInterface(true); }}
            className={`text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 transform hover:scale-105 ${showAvailabilityInterface ? 'text-blue-600' : ''}`}
          >
            Check Availability
          </button>

          <button
            onClick={() => { setShowMyBookings(true); setShowAvailabilityInterface(false); }}
            className={`text-gray-700 hover:text-blue-600 font-medium transition-all duration-300 transform hover:scale-105 ${showMyBookings ? 'text-blue-600' : ''}`}
          >
            My Bookings
          </button>
          
          {/* Profile Icon with Dropdown */}
          <div className="relative profile-dropdown-container">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              {/* User icon */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200 overflow-hidden">
                {/* User Info Section */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{currentUserName || 'User'}</h3>
                      <p className="text-blue-100 text-sm">Student</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                      </svg>
                      <span>Bachelor of Technology</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                      <span>Sem 7</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0z" />
                      </svg>
                      <span>{currentUserEmail}</span>
                    </div>
                    <div className="border-t border-blue-400 pt-2 mt-2">
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3M18 9v3m0 0v3m0-3h3m-3 0h-3" />
                        </svg>
                        <span>Centurion University, Vizianagaram</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Links Section */}
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center space-x-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    <span className="text-red-600 font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {!showAvailabilityInterface && !showMyBookings ? (
        <main className="relative z-0 flex flex-col md:flex-row items-center justify-between px-8 py-16 max-w-7xl mx-auto gap-8 flex-grow">
          {/* Left Section - Text Content */}
          <div className="flex-1 text-center md:text-left animate-fade-in-up">
            <h1 className="text-5xl font-bold leading-tight mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800 inline-block animate-slide-in-left">Find and Book the</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800 inline-block animate-slide-in-left animation-delay-200">Perfect Hall for Your</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800 inline-block animate-slide-in-left animation-delay-400">Event</span>
            </h1>

            <p className="text-gray-700 text-lg mb-8 animate-fade-in animation-delay-600">
              Plan your events effortlessly by discovering and booking the ideal campus
              gallery hall with just a few simple steps.
            </p>

            {/* Explore Halls Button */}
            <button
              onClick={() => setShowAvailabilityInterface(true)}
              className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl animate-bounce-in animation-delay-800 overflow-hidden">
              <span className="relative z-10">Explore Halls</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>

          {/* Right Section - Single Image Carousel */}
          <div className="flex-1 flex justify-center md:justify-end">
            <div className="relative z-0 w-full max-w-lg">
              {/* Single Image Carousel */}
              <div className="relative">
                <div className="w-full h-96 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-white/30 animate-scale-in group cursor-pointer"
                  onClick={() => {
                    // Store booking details for the booking form
                    const currentHall = hallsData[currentImageIndex]
                    const bookingDetails = {
                      hallId: currentHall.id,
                      hallName: currentHall.name,
                      date: new Date().toISOString().split('T')[0], // Today's date as default
                      duration: '02:00', // 2 hours as default
                      description: currentHall.description,
                      image: currentHall.image
                    }
                    localStorage.setItem('pendingBooking', JSON.stringify(bookingDetails))
                    window.location.href = '/booking-form'
                  }}
                >
                  <div className="relative h-full">
                    <img 
                      src={hallsData[currentImageIndex].image} 
                      alt={hallsData[currentImageIndex].name} 
                      className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    <h3 className="absolute bottom-4 left-4 text-white text-2xl font-bold drop-shadow-lg">
                      {hallsData[currentImageIndex].name}
                    </h3>
                    <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Click to Book
                    </div>
                  </div>
                </div>
                
                {/* Carousel Navigation Dots */}
                <div className="flex justify-center mt-4 space-x-2">
                  {hallsData.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors duration-300 cursor-pointer ${
                        index === currentImageIndex ? 'bg-blue-600' : 'bg-blue-300 hover:bg-blue-500'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    ></div>
                  ))}
                </div>
              </div>
              
              {/* Floating Elements around carousel */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-400 rounded-full opacity-60 animate-float animation-delay-1000"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-purple-400 rounded-full opacity-60 animate-float animation-delay-2000"></div>
              <div className="absolute top-1/2 -right-8 w-4 h-4 bg-pink-400 rounded-full opacity-60 animate-float animation-delay-3000"></div>
            </div>
          </div>
        </main>
      ) : showAvailabilityInterface ? (
        <AvailabilityPage />
      ) : showMyBookings ? (
        <main className="relative z-10 flex-1 p-8 max-w-7xl mx-auto w-full">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6 animate-fade-in-up">My Bookings</h1>
          <div className="glass bg-white/80 backdrop-blur-lg shadow-2xl rounded-2xl overflow-hidden border border-white/20 animate-scale-in">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Booking ID</th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Hall Name</th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Event Name</th>
                  <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {myBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-gray-600">No bookings found.</td>
                  </tr>
                ) : (
                  myBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 text-sm text-gray-700">{b.id}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{b.hallName}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{b.bookingDate}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{b.bookingTime}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{b.eventName || '-'}</td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`${b.status === 'approved' ? 'bg-green-100 text-green-800' : b.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'} px-2 py-1 rounded-full text-xs font-semibold`}>
                          {b.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="text-center mt-8">
            <button
              onClick={() => { setShowMyBookings(false); setShowAvailabilityInterface(false); }}
              className="group relative bg-gradient-to-r from-gray-600 to-gray-800 text-white px-8 py-4 rounded-full font-medium hover:from-gray-700 hover:to-gray-900 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden mr-4"
            >
              <span className="relative z-10">Back</span>
              <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
            <button
              onClick={() => { setShowMyBookings(false); setShowAvailabilityInterface(true); }}
              className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
            >
              <span className="relative z-10">Book New Hall</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
        </main>
      ) : null}
    </div>
  )
}
