import dbConnect from '../../lib/mongoose.js';
import User from '../../models/User.js';

// GET /api/users
export async function GET(req, res) {
  try {
    await dbConnect();
    const users = await User.find({}, { password: 0 }).lean();
    res.status(200).json({ users });
  } catch (e) {
    console.error('Users GET error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
}