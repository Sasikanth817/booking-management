import mongoose, { Schema, model, models } from 'mongoose'

export interface IBooking extends mongoose.Document {
  hallName: string
  bookingDate: string
  bookingTime: string
  startTime: string
  endTime: string
  name: string
  email: string
  phoneNumber: string
  department: string
  eventName: string
  eventPurpose: string
  userEmail: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
}

const BookingSchema = new Schema<IBooking>({
  hallName: { type: String, required: true },
  bookingDate: { type: String, required: true },
  bookingTime: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  department: { type: String, required: true },
  eventName: { type: String, required: true },
  eventPurpose: { type: String, required: true },
  userEmail: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
})

const Booking = models.Booking || model<IBooking>('Booking', BookingSchema)
export default Booking
