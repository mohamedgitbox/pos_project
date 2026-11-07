import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  name: string;
  SKU: string;
  barcode: string;
  costPrice: mongoose.Types.Decimal128;
  sellingPrice: mongoose.Types.Decimal128;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    SKU: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    barcode: {
      type: String,
      required: true,
      index: true,
    },
    costPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    sellingPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ name: "text" });
productSchema.index({ SKU: 1 }, { unique: true });

export default mongoose.model<IProduct>("Product", productSchema);
