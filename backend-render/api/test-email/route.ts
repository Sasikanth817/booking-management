import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    console.log('Testing email configuration...')
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set')
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    // Test email configuration
    await transporter.verify()
    console.log('Email configuration is valid')

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Test Email - HALL MATE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">HALL MATE</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0;">Email Test</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Test Email</h2>
            <p style="color: #4b5563; line-height: 1.6;">This is a test email to verify that the email configuration is working correctly.</p>
            <p style="color: #4b5563; line-height: 1.6;">If you receive this email, the email system is properly configured!</p>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">Sent from HALL MATE Booking System</p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log('Test email sent successfully to:', email)

    return NextResponse.json({ 
      message: 'Test email sent successfully!' 
    }, { status: 200 })

  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ 
      message: `Email test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}
