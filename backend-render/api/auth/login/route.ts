import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '../../../lib/mongoose'
import User from '../../../models/User'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 })
    }

    // Allow admin bypass regardless of domain restriction
    const isAdminBypass = email === '221801390010@cutmap.ac.in' && password === 'Admin@123'

    // Enforce college email domain for all other users
    const allowedDomain = '@cutmap.ac.in'
    if (!isAdminBypass && !email.toLowerCase().endsWith(allowedDomain)) {
      return NextResponse.json({ message: `Only ${allowedDomain} emails are allowed` }, { status: 400 })
    }

    await dbConnect()

    // Admin bypass
    if (isAdminBypass) {
      let admin = await User.findOne({ email })
      if (!admin) {
        const hashed = await bcrypt.hash(password, 10)
        admin = await User.create({ name: 'Admin', email, password: hashed, role: 'admin' })
      }
      return NextResponse.json({
        message: 'Admin login successful',
        user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
      }, { status: 200 })
    }

    const user = await User.findOne({ email })
    if (!user) return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })

    if (user.role === 'admin') {
      return NextResponse.json({ message: 'Admins must use the dedicated admin login flow' }, { status: 403 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 })

    return NextResponse.json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    }, { status: 200 })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
