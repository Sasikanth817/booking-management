import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const resetTokensFilePath = path.resolve(process.cwd(), 'reset-tokens.json')

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

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 })
    }

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

    return NextResponse.json({ 
      message: 'Token is valid',
      email: resetToken.email 
    }, { status: 200 })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json({ 
      message: 'Failed to verify token' 
    }, { status: 500 })
  }
}
