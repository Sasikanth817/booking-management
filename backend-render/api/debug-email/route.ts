import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const emailConfig = {
      EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
      EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'Not set',
      adminEmail: '221801390010@cutmap.ac.in'
    }

    return NextResponse.json({
      message: 'Email configuration status',
      config: emailConfig,
      timestamp: new Date().toISOString()
    }, { status: 200 })
    
  } catch (error) {
    return NextResponse.json({ 
      message: `Debug error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 })
  }
}
