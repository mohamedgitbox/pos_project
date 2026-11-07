import mongoose, { Schema, Document } from "mongoose";

export interface ISale extends Document {
  invoiceNo: string;
  branchId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  totalAmount: mongoose.Types.Decimal128;
  timestamp: Date;
  idempotencyKey?: string;
}

export interface ISaleItem extends Document {
  saleId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: mongoose.Types.Decimal128;
}

const saleSchema = new Schema<ISale>(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    totalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

const saleItemSchema = new Schema<ISaleItem>(
  {
    saleId: {
      type: Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  { timestamps: true }
);

export const Sale = mongoose.model<ISale>("Sale", saleSchema);
export const SaleItem = mongoose.model<ISaleItem>("SaleItem", saleItemSchema);
