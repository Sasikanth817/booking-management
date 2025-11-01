import { NextResponse } from 'next/server'
import dbConnect from '../../lib/mongoose'
import Hall from '../../models/Hall'

export async function GET() {
  try {
    await dbConnect()
    let halls = await Hall.find({}).lean()
    
    // If no halls exist, initialize default halls
    if (halls.length === 0) {
      const defaultHalls = [
        {
          name: 'Gallery Hall 1',
          description: 'A spacious hall ideal for large exhibitions and conferences, with modern audio-visual equipment. Located in Block C, 1st Floor, Capacity: 100-120 people.',
          capacity: '100-120 people',
          location: 'Block C, 1st Floor',
          image: '/halls/Galleryhall1.jpg'
        },
        {
          name: 'Gallery Hall 2',
          description: 'Perfect for medium-sized events, seminars, and workshops. Equipped with comfortable seating. Located in Block C, 1st Floor, Capacity: 100-120 people.',
          capacity: '100-120 people',
          location: 'Block C, 1st Floor',
          image: '/halls/Galleryhall2.jpg'
        },
        {
          name: 'Board Room',
          description: 'Small and cozy, suitable for private meetings, presentations, and small gatherings. Located in Block B, Ground Floor, Capacity: 30-50 people.',
          capacity: '30-50 people',
          location: 'Block B, Ground Floor',
          image: '/halls/Board room.jpg'
        },
        {
          name: 'B 05',
          description: 'A large, state-of-the-art conference hall with multiple projectors and seating for up to 200. Ideal for major university events. Located in Main Building, 2nd Floor.',
          capacity: 'Up to 200 people',
          location: 'Main Building, 2nd Floor',
          image: '/halls/B 05.jpg'
        }
      ]

      // Create all default halls
      await Hall.insertMany(defaultHalls)
      
      // Fetch the newly created halls
      halls = await Hall.find({}).lean()
    }
    
    const normalized = halls.map((h: any) => ({
      id: h._id.toString(),
      name: h.name,
      description: h.description,
      capacity: h.capacity,
      location: h.location,
      image: h.image || '',
      createdAt: h.createdAt
    }))
    return NextResponse.json({ halls: normalized }, { status: 200 })
  } catch (e) {
    console.error('Halls GET error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    await dbConnect()

    const { name, description, capacity, location, image } = payload || {}
    
    if (!name || !description || !capacity || !location) {
      return NextResponse.json({ message: 'Missing required fields: name, description, capacity, or location' }, { status: 400 })
    }

    // Check if hall with same name already exists
    const existing = await Hall.findOne({ name }).lean()
    if (existing) {
      return NextResponse.json({ message: 'Hall with this name already exists' }, { status: 409 })
    }

    const created = await Hall.create({ 
      name, 
      description, 
      capacity, 
      location, 
      image: image || '',
      createdAt: new Date() 
    })
    
    return NextResponse.json({ 
      id: created._id.toString(),
      name: created.name,
      description: created.description,
      capacity: created.capacity,
      location: created.location,
      image: created.image || '',
      createdAt: created.createdAt
    }, { status: 201 })
  } catch (e: any) {
    console.error('Halls POST error:', e)
    if (e.code === 11000) {
      return NextResponse.json({ message: 'Hall with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json()
    await dbConnect()

    const { id, name, description, capacity, location, image } = payload || {}
    
    if (!id) {
      return NextResponse.json({ message: 'Hall ID is required' }, { status: 400 })
    }

    if (!name || !description || !capacity || !location) {
      return NextResponse.json({ message: 'Missing required fields: name, description, capacity, or location' }, { status: 400 })
    }

    // Check if another hall with same name exists (excluding current hall)
    const existing = await Hall.findOne({ name, _id: { $ne: id } }).lean()
    if (existing) {
      return NextResponse.json({ message: 'Another hall with this name already exists' }, { status: 409 })
    }

    const updated = await Hall.findByIdAndUpdate(
      id,
      { name, description, capacity, location, image: image || '' },
      { new: true, runValidators: true }
    ).lean() as any

    if (!updated) {
      return NextResponse.json({ message: 'Hall not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      id: updated._id.toString(),
      name: updated.name,
      description: updated.description,
      capacity: updated.capacity,
      location: updated.location,
      image: updated.image || '',
      createdAt: updated.createdAt
    }, { status: 200 })
  } catch (e: any) {
    console.error('Halls PUT error:', e)
    if (e.code === 11000) {
      return NextResponse.json({ message: 'Another hall with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ message: 'Hall ID is required' }, { status: 400 })
    }

    await dbConnect()

    const deleted = await Hall.findByIdAndDelete(id).lean()

    if (!deleted) {
      return NextResponse.json({ message: 'Hall not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Hall deleted successfully' }, { status: 200 })
  } catch (e) {
    console.error('Halls DELETE error:', e)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

