import dbConnect from '../../lib/mongoose.js';
import Booking from '../../models/Booking.js';

// GET /api/bookings
export async function GET(req, res) {
  try {
    await dbConnect();
    
    // Parse query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userEmail = url.searchParams.get('userEmail') || undefined;
    const bookingDate = url.searchParams.get('bookingDate') || undefined;
    const hallName = url.searchParams.get('hallName') || undefined;

    const query = {};
    if (userEmail) query.userEmail = userEmail;
    if (bookingDate) query.bookingDate = bookingDate;
    if (hallName) query.hallName = hallName;

    const bookings = await Booking.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ bookings });
  } catch (e) {
    console.error('Bookings GET error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// POST /api/bookings
export async function POST(req, res) {
  try {
    await dbConnect();
    
    let payload = {};
    try {
      payload = await new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
        req.on('error', reject);
      });
    } catch (e) {
      return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    
    // Conflict check: overlapping booking for same hall/date/time window
    const { hallName, bookingDate, startTime, endTime } = payload;
    if (!hallName || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing hallName, bookingDate, startTime, or endTime' });
    }

    // Find all bookings for same hall and date
    const sameDay = await Booking.find({ hallName, bookingDate }).lean();

    const toMinutes = (t) => {
      const [h, m] = String(t).split(':').map((x) => parseInt(x, 10) || 0);
      return h * 60 + m;
    };
    
    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    const overlaps = sameDay.some((b) => {
      const bStart = toMinutes(b.startTime);
      const bEnd = toMinutes(b.endTime);
      return newStart < bEnd && newEnd > bStart;
    });

    if (overlaps) {
      return res.status(409).json({ message: 'Selected hall is already booked for the chosen time window.' });
    }

    const created = await Booking.create({ ...payload, createdAt: new Date() });
    res.status(201).json({ id: created._id });
  } catch (e) {
    console.error('Bookings POST error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// PATCH /api/bookings
export async function PATCH(req, res) {
  try {
    await dbConnect();
    
    let payload = {};
    try {
      payload = await new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
        req.on('error', reject);
      });
    } catch (e) {
      return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    
    const { id, status } = payload;
    if (!id || !status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid id or status' });
    }
    
    const updated = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean();
    
    if (!updated) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.status(200).json({ booking: { id: updated._id, ...updated } });
  } catch (e) {
    console.error('Bookings PATCH error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
}