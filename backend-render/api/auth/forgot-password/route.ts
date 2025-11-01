import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import dbConnect from '../../../lib/mongoose'
import User from '../../../models/User'

const usersFilePath = path.resolve(process.cwd(), 'users.json')
const resetTokensFilePath = path.resolve(process.cwd(), 'reset-tokens.json')

async function readUsers() {
  try {
    const data = await fs.promises.readFile(usersFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

async function readResetTokens() {
  try {
    const data = await fs.promises.readFile(resetTokensFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

async function writeResetTokens(tokens: any[]) {
  await fs.promises.writeFile(resetTokensFilePath, JSON.stringify(tokens, null, 2), 'utf-8')
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    // Check if email ends with @cutmap.ac.in
    if (!email.endsWith('@cutmap.ac.in')) {
      return NextResponse.json({ message: 'Please enter a valid @cutmap.ac.in email address.' }, { status: 400 })
    }

    // Check if user exists in MongoDB first, then fallback to users.json
    await dbConnect()
    let user = await User.findOne({ email }).lean()
    
    if (!user) {
      // Fallback to users.json for backward compatibility
      const users = await readUsers()
      const jsonUser = users.find((u: any) => u.email === email)
      if (!jsonUser) {
        return NextResponse.json({ message: 'No account found with this email address.' }, { status: 404 })
      }
      user = jsonUser
    }

    // Type guard to satisfy TypeScript
    if (!user) {
      return NextResponse.json({ message: 'No account found with this email address.' }, { status: 404 })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token
    const resetTokens = await readResetTokens()
    const existingTokenIndex = resetTokens.findIndex((token: any) => token.email === email)
    
    const newToken = {
      email,
      token: resetToken,
      expiresAt: expiresAt.toISOString(),
      used: false
    }

    if (existingTokenIndex >= 0) {
      resetTokens[existingTokenIndex] = newToken
    } else {
      resetTokens.push(newToken)
    }

    await writeResetTokens(resetTokens)

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - Centurion University',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af, #7c3aed); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Centurion University</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Hello ${(user as any).name},</h2>
            
            <p style="color: #4b5563; line-height: 1.6;">
              We received a request to reset your password for your Centurion University account. 
              If you made this request, click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #1e40af; word-break: break-all;">${resetLink}</a>
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Important:</strong> This link will expire in 1 hour for security reasons. 
                If you didn't request this password reset, please ignore this email.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Best regards,<br>
              Centurion University IT Team
            </p>
          </div>
        </div>
      `,
    }

    try {
      await transporter.sendMail(mailOptions)
      console.log('Password reset email sent successfully to:', email)
      
      return NextResponse.json({ 
        message: 'Password reset link sent to your email!' 
      }, { status: 200 })
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      return NextResponse.json({ 
        message: 'Failed to send email. Please check your email configuration.' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ 
      message: 'Failed to send password reset email. Please try again.' 
    }, { status: 500 })
  }
}
