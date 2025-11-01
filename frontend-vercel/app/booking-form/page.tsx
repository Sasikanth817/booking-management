'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiCall } from '../../lib/api'

const departments = [
  'Computer Science',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Management',
  'Applied Sciences',
]

export default function BookingFormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [hallName, setHallName] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('') // duration string like HH:MM

  // Profile/header state
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  // Start/End time state (duration-based)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const WORK_START = 9
  const WORK_END = 17
  const timeToLabel = (h: number) => `${String(h).padStart(2,'0')}:00`

  const getStartTimeOptions = (durationStr: string): string[] => {
    const [dh, dm] = (durationStr || '02:00').split(':').map(Number)
    const durHours = dh + (dm ? dm/60 : 0)
    const latestStart = WORK_END - durHours
    const options: string[] = []
    for (let h = WORK_START; h <= latestStart; h++) {
      options.push(timeToLabel(h))
    }
    return options
  }

  const addDuration = (time: string, durationStr: string) => {
    const [sh, sm] = time.split(':').map(Number)
    const [dh, dm] = durationStr.split(':').map(Number)
    const totalMinutes = sh*60 + sm + dh*60 + (dm || 0)
    const eh = Math.floor(totalMinutes/60)
    const em = totalMinutes % 60
    return `${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`
  }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    department: '',
    eventName: '',
    eventPurpose: '',
  })

  useEffect(() => {
    // Load header user info (do not prefill the email field per request)
    const loggedInEmail = localStorage.getItem('loggedInUserEmail') || ''
    setCurrentUserEmail(loggedInEmail)

    const fetchUserDetails = async () => {
      if (!loggedInEmail) return
      try {
        const response = await apiCall('/api/users')
        if (response.ok) {
          const data = await response.json()
          const currentUser = data.users.find((user: any) => user.email === loggedInEmail)
          if (currentUser) setCurrentUserName(currentUser.name)
        }
      } catch (error) {
        console.error('Error fetching user details:', error)
      }
    }
    fetchUserDetails()
  }, [])

  // Load booking data (hallName/date/duration) from localStorage or URL
  useEffect(() => {
    const pendingBooking = localStorage.getItem('pendingBooking')
    if (pendingBooking) {
      try {
        const bookingData = JSON.parse(pendingBooking)
        setHallName(bookingData.hallName || '')
        setBookingDate(bookingData.date || '')
        if (bookingData.duration) setBookingTime(bookingData.duration)
        return
      } catch (e) {
        console.error('Error parsing pending booking:', e)
      }
    }

    const hName = searchParams.get('hallName')
    const date = searchParams.get('date')
    const duration = searchParams.get('duration')

    if (hName && date && duration) {
      setHallName(hName)
      setBookingDate(new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }))
      setBookingTime(duration)
    }
  }, [searchParams])

  // Recompute end time whenever start or duration changes
  useEffect(() => {
    if (startTime && bookingTime) {
      const et = addDuration(startTime, bookingTime)
      setEndTime(et)
    } else {
      setEndTime('')
    }
  }, [startTime, bookingTime])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showProfileDropdown && !target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileDropdown])

  const handleLogout = () => {
    localStorage.removeItem('loggedInUserEmail')
    window.location.href = '/auth'
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bookingTime) {
      alert('Please ensure a duration is set.')
      return
    }
    if (!startTime) {
      alert('Please select a start time.')
      return
    }
    if (!endTime) {
      alert('End time is invalid. Please reselect start time.')
      return
    }

    const newBooking = {
      hallName,
      bookingDate,
      bookingTime, // duration
      startTime,
      endTime,
      ...formData,
      userEmail: currentUserEmail || formData.email, // reliable user email for filtering
      status: 'pending', // Initial status
    }

    try {
      // Create booking in DB
      const createRes = await apiCall('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      })
      if (createRes.status === 409) {
        const err = await createRes.json().catch(() => ({ message: 'Selected hall is already booked for the chosen time window.' }))
        alert(err.message || 'Selected hall is already booked for the chosen time window.')
        return
      }
      if (!createRes.ok) throw new Error('Failed to create booking')

      // Send booking email to admin
      try {
        const emailRes = await apiCall('/api/send-booking-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newBooking })
        })
        if (emailRes.ok) {
          console.log('Admin notification email sent successfully')
        } else {
          const errorData = await emailRes.json().catch(() => ({ message: 'Unknown error' }))
          console.error('Failed to send admin notification email:', errorData.message)
          // Don't fail the booking if email fails, just log the error
        }
      } catch (emailError) {
        console.error('Error sending admin notification email:', emailError)
        // Don't fail the booking if email fails, just log the error
      }

      alert('Booking request submitted successfully! You will be redirected to your bookings.')
      localStorage.removeItem('pendingBooking')
      setTimeout(() => {
        window.location.href = '/halls-dashboard?view=my-bookings'
      }, 800)
    } catch (err) {
      console.error(err)
      alert('Failed to submit booking. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      {/* Header - Reusing the structure from halls-dashboard */}
      <header className="relative z-50 flex justify-between items-center px-8 py-4 backdrop-blur-lg bg-white/80 shadow-lg w-full max-w-7xl rounded-lg mb-8 border border-white/20 animate-fade-in-up">
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <div>
            <img src='/halls/Hall Logo.png' height={"50"} width={"50"}></img>
          </div>
          <div className="text-lg font-semibold">
            <div className="text-gray-800">HALL</div>
            <div className="text-gray-600">MATE</div>
          </div>
        </div>
        <nav className="flex items-center space-x-6">
          <button
            onClick={() => router.push('/halls-dashboard')}
            className="text-gray-700 hover:text-blue-600 font-medium"
          >
            Home
          </button>
          <button
            onClick={() => router.push('/halls-dashboard?view=availability')}
            className="text-gray-700 hover:text-blue-600 font-medium"
          >
            Check Availability
          </button>
          <button
            onClick={() => router.push('/halls-dashboard?view=my-bookings')}
            className="text-gray-700 hover:text-blue-600 font-medium"
          >
            My Bookings
          </button>

          {/* Profile Icon with Dropdown */}
          <div className="relative profile-dropdown-container">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="text-gray-700 hover:text-blue-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200 overflow-hidden">
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

      <div className="relative z-10 glass bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-3xl w-full border border-white/20 animate-scale-in">
        <h2 className="text-4xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-center mb-8 font-bold animate-fade-in-up">Booking Form</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 mb-8 text-lg font-medium text-gray-700 text-center">
          <div>Room: <span className="font-bold text-gray-900">{hallName || 'N/A'}</span></div>
          <div>Date: <span className="font-bold text-gray-900">{bookingDate || 'N/A'}</span></div>
          <div>Duration: <span className="font-bold text-gray-900">{bookingTime ? `${bookingTime} hours` : '-'}</span></div>
        </div>

        {/* Start/End Time Selection (duration-based) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-left">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-3 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            >
              <option value="">Select start time</option>
              {getStartTimeOptions(bookingTime || '02:00').map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="text-left">
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Time (auto)</label>
            <input
              type="text"
              value={endTime}
              readOnly
              className="w-full p-3 bg-gray-100 border border-white/30 rounded-xl"
              placeholder="Select start time first"
            />
          </div>
          <div className="text-left">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Working Hours</label>
            <div className="p-3 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl text-gray-700">09:00 – 17:00</div>
          </div>
        </div>

        <form onSubmit={(e) => {
          // validate no backdated submission
          if (bookingDate) {
            const today = new Date();
            today.setHours(0,0,0,0)
            const [dd, mm, yyyy] = bookingDate.includes('-') && bookingDate.split('-').length === 3 && bookingDate.split('-')[2].length === 4
              ? bookingDate.split('-')
              : bookingDate.split('/') // try both formats just in case
            let normalizedDate: Date | null = null
            if (yyyy && mm && dd) {
              normalizedDate = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10))
              normalizedDate.setHours(0,0,0,0)
            }
            if (normalizedDate && normalizedDate < today) {
              e.preventDefault()
              alert('Backdated booking is not allowed.')
              return
            }
          }
          handleSubmit(e)
        }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={formData.name}
            onChange={handleInputChange}
            className="p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 animate-scale-in animation-delay-200"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
            className="p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 animate-scale-in animation-delay-400"
            required
          />
          <input
            type="tel"
            name="phoneNumber"
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            className="p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 animate-scale-in animation-delay-600"
            required
          />
          <select
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            className="p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 animate-scale-in animation-delay-800"
            required
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <input
            type="text"
            name="eventName"
            placeholder="Event Name"
            value={formData.eventName}
            onChange={handleInputChange}
            className="p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 animate-scale-in animation-delay-1000"
            required
          />
          <input
            type="text"
            name="eventPurpose"
            placeholder="Event Purpose"
            value={formData.eventPurpose}
            onChange={handleInputChange}
            className="p-4 bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:bg-white/70 animate-scale-in animation-delay-1200"
            required
          />
          
          <div className="md:col-span-2 text-center mt-6">
            <button
              type="submit"
              className="group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-full font-medium text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden animate-bounce-in animation-delay-1400"
            >
              <span className="relative z-10">Submit Booking</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </button>
          </div>
        </form>

        {/* Back to Availability */}
        <div className="text-center mt-8">
          <Link href="/availability" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Availability Check
          </Link>
        </div>
      </div>
    </div>
  )
}
