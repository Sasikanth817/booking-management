import { NextResponse } from 'next/server'
import dbConnect from '../../lib/mongoose'
import Booking from '../../models/Booking'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('userEmail') || undefined
    const bookingDate = searchParams.get('bookingDate') || undefined
    const hallName = searchParams.get('hallName') || undefined

    await dbConnect()
    const query: any = {}
    if (userEmail) query.userEmail = userEmail
    if (bookingDate) query.bookingDate = bookingDate
    if (hallName) query.hallName = hallName

    const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ bookings }, { status: 200 })
  } catch (e) {
    console.error('Bookings GET error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    await dbConnect()

    // Conflict check: overlapping booking for same hall/date/time window
    const { hallName, bookingDate, startTime, endTime } = payload || {}
    if (!hallName || !bookingDate || !startTime || !endTime) {
      return NextResponse.json({ message: 'Missing hallName, bookingDate, startTime, or endTime' }, { status: 400 })
    }

    // Normalize date to a consistent format for matching
    // bookingDate is stored as string like 'DD/MM/YYYY' from BookingForm
    const dateStr = bookingDate

    // Find all bookings for same hall and date
    const sameDay = await Booking.find({ hallName, bookingDate: dateStr }).lean()

    const toMinutes = (t: string) => {
      const [h, m] = String(t).split(':').map((x: string) => parseInt(x, 10) || 0)
      return h * 60 + m
    }
    const newStart = toMinutes(startTime)
    const newEnd = toMinutes(endTime)

    const overlaps = sameDay.some((b: any) => {
      const bStart = toMinutes(b.startTime)
      const bEnd = toMinutes(b.endTime)
      return newStart < bEnd && newEnd > bStart
    })

    if (overlaps) {
      return NextResponse.json({ message: 'Selected hall is already booked for the chosen time window.' }, { status: 409 })
    }

    const created = await Booking.create({ ...payload, createdAt: new Date() })
    return NextResponse.json({ id: created._id }, { status: 201 })
  } catch (e) {
    console.error('Bookings POST error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json()
    if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ message: 'Invalid id or status' }, { status: 400 })
    }
    await dbConnect()
    const updated = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean()
    if (!updated) {
      return NextResponse.json({ message: 'Booking not found' }, { status: 404 })
    }
    const updatedAny: any = updated
    return NextResponse.json({ booking: { id: updatedAny._id, ...updatedAny } }, { status: 200 })
  } catch (e) {
    console.error('Bookings PATCH error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
