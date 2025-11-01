import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  const { bookingId, newStatus, userEmail, bookingDetails } = await request.json()
  console.log(`Attempting to send email to user ${userEmail} for booking ${bookingId} with status ${newStatus}.`)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

  const mailOptions = {
    from: {
      name: 'HALL MATE Admin',
      address: process.env.EMAIL_USER
    },
    replyTo: '221801390010@cutmap.ac.in', // Admin's email for replies
    to: userEmail,
    subject: `Your Booking for ${bookingDetails.hallName} has been ${newStatus.toUpperCase()}`,
    html: `<p>Dear ${bookingDetails.name},</p>
           <p>Your booking for <strong>${bookingDetails.hallName}</strong> on <strong>${bookingDetails.bookingDate}</strong> at <strong>${bookingDetails.bookingTime}</strong> has been <strong>${newStatus.toUpperCase()}</strong>.</p>
           <p><strong>Booking ID:</strong> ${bookingDetails.id}</p>
           <p><strong>Event:</strong> ${bookingDetails.eventName}</p>
           <p>Thank you.</p>`,
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('User notification email sent successfully.')
    return NextResponse.json({ message: 'User notification sent successfully' }, { status: 200 })
  } catch (error) {
    console.error('Error sending user notification email:', error)
    return NextResponse.json({ message: 'Failed to send user notification' }, { status: 500 })
  }
}