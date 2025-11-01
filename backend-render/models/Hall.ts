import mongoose, { Schema, model, models } from 'mongoose'

export interface IHall extends mongoose.Document {
  name: string
  description: string
  capacity: string
  location: string
  image?: string
  createdAt: Date
}

const HallSchema = new Schema<IHall>({
  name: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  capacity: { type: String, required: true },
  location: { type: String, required: true },
  image: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
})

const Hall = models.Hall || model<IHall>('Hall', HallSchema)
export default Hall

