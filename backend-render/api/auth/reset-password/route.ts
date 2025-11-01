import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
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

async function writeUsers(users: any[]) {
  await fs.promises.writeFile(usersFilePath, JSON.stringify(users, null, 2), 'utf-8')
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
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    // Verify token
    const resetTokens = await readResetTokens()
    const resetToken = resetTokens.find((t: any) => t.token === token)

    if (!resetToken) {
      return NextResponse.json({ message: 'Invalid reset token' }, { status: 400 })
    }

    if (resetToken.used) {
      return NextResponse.json({ message: 'Reset token has already been used' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(resetToken.expiresAt)

    if (now > expiresAt) {
      return NextResponse.json({ message: 'Reset token has expired' }, { status: 400 })
    }

    // Update user password in both MongoDB and users.json
    await dbConnect()
    
    // Update in MongoDB
    const mongoUser = await User.findOne({ email: resetToken.email })
    if (!mongoUser) {
      return NextResponse.json({ message: 'User not found in database' }, { status: 404 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Update MongoDB
    await User.findByIdAndUpdate(mongoUser._id, { password: hashedPassword })

    // Also update users.json for consistency
    const users = await readUsers()
    const userIndex = users.findIndex((u: any) => u.email === resetToken.email)

    if (userIndex !== -1) {
      users[userIndex].password = hashedPassword
      await writeUsers(users)
    }

    // Mark token as used
    resetToken.used = true
    await writeResetTokens(resetTokens)

    return NextResponse.json({ 
      message: 'Password reset successfully' 
    }, { status: 200 })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ 
      message: 'Failed to reset password' 
    }, { status: 500 })
  }
}
