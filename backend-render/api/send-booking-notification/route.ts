import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const bookingDetails = await request.json()
    console.log('Attempting to send email to admin with booking details:', bookingDetails)

    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email credentials not configured. EMAIL_USER:', !!process.env.EMAIL_USER, 'EMAIL_PASS:', !!process.env.EMAIL_PASS)
      return NextResponse.json({ 
        message: 'Email service not configured. Please contact administrator.' 
      }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    // Verify email configuration
    try {
      await transporter.verify()
      console.log('Email transporter verified successfully')
    } catch (verifyError) {
      console.error('Email transporter verification failed:', verifyError)
      return NextResponse.json({ 
        message: 'Email service configuration error. Please contact administrator.' 
      }, { status: 500 })
    }

    const mailOptions = {
      from: {
        name: `${bookingDetails.name} (${bookingDetails.email})`,
        address: process.env.EMAIL_USER
      },
      replyTo: bookingDetails.email, // This makes replies go to the user
      to: '221801390010@cutmap.ac.in', // Admin's email
      subject: `New Hall Booking Request from ${bookingDetails.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">HALL MATE</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0;">New Booking Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">New Hall Booking Request</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              A new hall booking has been submitted. Here are the details:
            </p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Booking Details</h3>
              <ul style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li><strong>Hall Name:</strong> ${bookingDetails.hallName}</li>
                <li><strong>Booking Date:</strong> ${bookingDetails.bookingDate}</li>
                <li><strong>Booking Time:</strong> ${bookingDetails.bookingTime}</li>
                <li><strong>Start Time:</strong> ${bookingDetails.startTime || 'N/A'}</li>
                <li><strong>End Time:</strong> ${bookingDetails.endTime || 'N/A'}</li>
                <li><strong>Applicant Name:</strong> ${bookingDetails.name}</li>
                <li><strong>Applicant Email:</strong> ${bookingDetails.email}</li>
                <li><strong>Phone Number:</strong> ${bookingDetails.phoneNumber}</li>
                <li><strong>Department:</strong> ${bookingDetails.department}</li>
                <li><strong>Event Name:</strong> ${bookingDetails.eventName}</li>
                <li><strong>Event Purpose:</strong> ${bookingDetails.eventPurpose}</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin-dashboard" 
                 style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Review Booking
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Please log in to the admin dashboard to approve or reject this booking.
            </p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log('Admin notification email sent successfully to: 221801390010@cutmap.ac.in')
    return NextResponse.json({ message: 'Admin notification sent successfully' }, { status: 200 })
    
  } catch (error) {
    console.error('Error sending admin notification email:', error)
    return NextResponse.json({ 
      message: `Failed to send admin notification: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}