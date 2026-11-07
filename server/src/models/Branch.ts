import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
  name: string;
  type: string;
  location: string;
  phone: string;
}

const branchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

branchSchema.index({ name: 1 });

export default mongoose.model<IBranch>("Branch", branchSchema);
