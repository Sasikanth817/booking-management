import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '../../../lib/mongoose'
import User from '../../../models/User'
import fs from 'fs'
import path from 'path'

const usersFilePath = path.resolve(process.cwd(), 'users.json')

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

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 })
    }

    // Enforce college email domain
    const allowedDomain = '@cutmap.ac.in'
    if (!email.toLowerCase().endsWith(allowedDomain)) {
      return NextResponse.json({ message: `Only ${allowedDomain} emails are allowed` }, { status: 400 })
    }

    await dbConnect()

    const existing = await User.findOne({ email }).lean()
    if (existing) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user in MongoDB
    const newUser = await User.create({ name, email, password: hashedPassword, role: 'user' })

    // Also add to users.json for compatibility with password reset and other systems
    const users = await readUsers()
    const newUserForJson = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      password: hashedPassword,
      role: newUser.role
    }
    users.push(newUserForJson)
    await writeUsers(users)

    return NextResponse.json({ message: 'Signup successful', user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role } }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}