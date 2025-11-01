'use client'

import React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { apiCall } from '../../lib/api'

interface Hall {
  id: number;
  name: string;
  description: string;
  bookedSlots: { [key: string]: string[] };
  image: string;
}

// Simulated database for hall availability
const hallsData: Hall[] = [
  {
    id: 1,
    name: 'Gallery Hall 1',
    description: 'A spacious hall ideal for large exhibitions and conferences, with modern audio-visual equipment. Located in Block C, 1st Floor, Capacity: 100-120 people.',
    bookedSlots: {
      '2025-06-08': ['09:00-11:00', '13:00-15:00'],
      '2025-06-09': ['11:00-13:00'],
    
    },
    image:'/halls/Galleryhall1.jpg',
   
  },  
  {
    id: 2,
    name: 'Gallery Hall 2',
    description: 'Perfect for medium-sized events, seminars, and workshops. Equipped with comfortable seating. Located in Block C, 1st Floor, Capacity: 100-120 people.',
    bookedSlots: {
      '2025-06-08': ['11:00-13:00'],
      '2025-06-10': ['09:00-11:00', '15:00-17:00'],
    },
    image: '/halls/Galleryhall2.jpg',
  },
  {
    id: 3,
    name: 'Board Room',
    description: 'Small and cozy, suitable for private meetings, presentations, and small gatherings. Located in Block B, Ground Floor, Capacity: 30-50 people.',
    bookedSlots: {
      '2025-06-08': [], // Always available on this date
      '2025-06-11': ['09:00-11:00'],
    },
    image: '/halls/Board room.jpg',
  },
  {
    id: 4,
    name: 'B 05',
    description: 'A large, state-of-the-art conference hall with multiple projectors and seating for up to 200. Ideal for major university events. Located in Main Building, 2nd Floor.',
    bookedSlots: {
      '2025-06-08': ['09:00-17:00'], // Booked for full day
      '2025-06-12': ['09:00-11:00', '13:00-15:00'],
    },
    image: '/halls/B 05.jpg',
  },
]

const timeSlotDurations = [
  { label: '1 hour', value: '01:00' },
  { label: '2 hours', value: '02:00' },
  { label: '3 hours', value: '03:00' },
  { label: 'Half Day (4 hours)', value: '04:00' },
  { label: 'Full Day (8 hours)', value: '08:00' },
]
const availableTimeBlocks = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
]

export default function AvailabilityPage() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDuration, setSelectedDuration] = useState<string>('')
  const [availabilityResults, setAvailabilityResults] = useState<any[]>([])
  const [showStatus, setShowStatus] = useState(false)
  const [hoveredHall, setHoveredHall] = useState<number | null>(null)

  const calculateEndTime = (startTime: string, duration: string) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const durationInMinutes = parseInt(duration.split(':')[0]) * 60 + parseInt(duration.split(':')[1])
    const endMinutes = hours * 60 + minutes + durationInMinutes
    const endHour = Math.floor(endMinutes / 60)
    const endMinute = endMinutes % 60
    return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
  }

  const isTimeSlotBooked = (bookedSlots: string[], startTime: string, duration: string) => {
    const checkStart = new Date(`2000-01-01T${startTime}:00`).getTime()
    const checkEnd = new Date(`2000-01-01T${calculateEndTime(startTime, duration)}:00`).getTime()

    for (const bookedSlot of bookedSlots) {
      const [bookedStartStr, bookedEndStr] = bookedSlot.split('-')
      const bookedStart = new Date(`2000-01-01T${bookedStartStr}:00`).getTime()
      const bookedEnd = new Date(`2000-01-01T${bookedEndStr}:00`).getTime()

      // Check for overlap
      if (checkStart < bookedEnd && checkEnd > bookedStart) {
        return true
      }
    }
    return false
  }

  const handleCheckAvailability = async () => {
    if (!selectedDate || !selectedDuration) {
      alert('Please select both a date and a duration.')
      return
    }

    const fetches = hallsData.map(async (hall: Hall) => {
      try {
        const res = await apiCall(`/api/bookings?bookingDate=${encodeURIComponent(selectedDate)}&hallName=${encodeURIComponent(hall.name)}`)
        let totalMinutes = 0
        if (res.ok) {
          const data = await res.json()
          const bookings: any[] = data.bookings || []
          const toMinutes = (t: string) => {
            const [h, m] = String(t).split(':').map((x: string) => parseInt(x, 10) || 0)
            return h * 60 + m
          }
          bookings.forEach(b => {
            const start = toMinutes(b.startTime)
            const end = toMinutes(b.endTime)
            totalMinutes += Math.max(0, end - start)
          })
        }
        const isHallFullyBooked = totalMinutes >= 8 * 60
        return { ...hall, isAvailable: !isHallFullyBooked }
      } catch {
        return { ...hall, isAvailable: true }
      }
    })
    const results = await Promise.all(fetches)
    setAvailabilityResults(results)
    setShowStatus(true)
  }

  const handleBookNow = (hallId: number) => {
    if (!selectedDate || !selectedDuration) {
      alert('Please select a date and time duration before booking.')
      return
    }

    const hallToBook = hallsData.find((hall: Hall) => hall.id === hallId)
    if (!hallToBook) {
      alert('Hall not found.')
      return
    }

    // Store booking details in localStorage for the booking form
    const bookingDetails = {
      hallId: hallId,
      hallName: hallToBook.name,
      date: selectedDate,
      duration: selectedDuration,
      description: hallToBook.description,
      image: hallToBook.image
    }
    
    console.log('Storing booking details:', bookingDetails)
    localStorage.setItem('pendingBooking', JSON.stringify(bookingDetails))
    
    // Verify the data was stored
    const storedData = localStorage.getItem('pendingBooking')
    console.log('Stored data verification:', storedData)
    
    // Redirect to booking form
    window.location.href = '/booking-form'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans flex flex-col items-center py-12 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 glass bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-4xl w-full border border-white/20 animate-fade-in-up">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-center mb-8 animate-fade-in-up">Check Hall Availability</h2>

        {/* Calendar and Time Slot Selection */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8">
          {/* Select Date Input (Styled to match image) */}
          <div className="flex flex-col items-center bg-white/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/30 animate-scale-in animation-delay-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Select Date</h3>
            <div className="relative w-48">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 pr-10 border border-gray-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 hover:shadow-md"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                {/* Calendar Icon - SVG from Heroicons */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5m18 7.5v-7.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Time Slot Duration Selection (Dropdown) */}
          <div className="flex flex-col items-center bg-white/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/30 animate-scale-in animation-delay-400">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Select Duration</h3>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48 transition-all duration-300 hover:shadow-md"
            >
              <option value="">Select duration</option>
              {timeSlotDurations.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Check Availability Button */}
        <div className="text-center mb-12">
          <button
            onClick={() => {
              const today = new Date();
              today.setHours(0,0,0,0)
              if (!selectedDate) {
                alert('Please select a date first.')
                return
              }
              const sel = new Date(selectedDate);
              sel.setHours(0,0,0,0)
              if (sel < today) {
                alert('Backdated availability is not allowed. Please choose today or a future date.')
                return
              }
              handleCheckAvailability()
            }}
            className="group relative bg-gradient-to-r from-green-600 to-blue-600 text-white px-10 py-4 rounded-full font-medium text-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden animate-bounce-in animation-delay-600"
          >
            <span className="relative z-10">Check Availability</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        </div>

        {/* Hall Status Display - Removed, will be integrated into gallery cards */}

        {/* Back to Halls Dashboard */}
        <div className="text-center mt-12">
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back
          </button>
        </div>
      </div>

      {showStatus && (
      /* Gallery Halls Carousel Section with Status Bars */
      <section className="relative z-10 bg-gradient-to-r from-blue-50/50 to-purple-50/50 py-16 px-8 mt-12 w-full backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-center mb-8 animate-fade-in-up">Our Gallery Halls</h2>
          
          {/* Image Carousel with Status Bars */}
          <div className="relative">
            <div className="flex overflow-x-auto pb-4 space-x-6 scrollbar-hide snap-x snap-mandatory">
              {hallsData.map((hall, index) => {
                // Check if this hall is available (simplified logic)
                const isAvailable = !showStatus || availabilityResults.find(h => h.id === hall.id)?.isAvailable !== false
                
                return (
                  <div 
                    key={hall.id} 
                    className="flex-shrink-0 w-80 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/30 snap-center animate-scale-in"
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    <div className="relative">
                      <img 
                        src={hall.image} 
                        alt={hall.name} 
                        className="w-full h-64 object-cover transition-transform duration-500 hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                      <h3 className="absolute bottom-4 left-4 text-white text-xl font-bold drop-shadow-lg">
                        {hall.name}
                      </h3>
                    </div>
                    
                    <div className="p-6">
                      {/* Status Bar */}
                      {showStatus && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Availability Status</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isAvailable 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {isAvailable ? 'Available' : 'Not Available'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isAvailable ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: isAvailable ? '100%' : '100%' }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      <div className="text-gray-700 text-sm mb-4">
                        <p className="mb-2">{hall.description.split('.')[0]?.trim()}.</p>
                        <p className="text-blue-600 font-medium">{hall.description.split('.')[1]?.trim()}</p>
                        <p className="text-purple-600 font-medium">{hall.description.split('.')[2]?.trim()}</p>
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          // prevent booking with back date
                          const today = new Date();
                          today.setHours(0,0,0,0)
                          const sel = new Date(selectedDate)
                          sel.setHours(0,0,0,0)
                          if (sel < today) {
                            alert('Backdated booking is not allowed. Please choose today or a future date.')
                            return
                          }
                          handleBookNow(hall.id)
                        }} 
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Carousel Navigation Dots */}
            <div className="flex justify-center mt-6 space-x-2">
              {hallsData.map((_, index) => (
                <div
                  key={index}
                  className="w-3 h-3 bg-blue-300 rounded-full hover:bg-blue-500 transition-colors duration-300 cursor-pointer"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}
    </div>
  )
}
