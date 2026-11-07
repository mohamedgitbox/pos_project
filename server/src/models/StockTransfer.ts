import mongoose, { Schema, Document } from "mongoose";

export interface IStockTransfer extends Document {
  transferNo: string;
  fromBranchId: mongoose.Types.ObjectId;
  toBranchId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  status: string;
  timestamp: Date;
}

export interface ITransferItem extends Document {
  transferId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

const stockTransferSchema = new Schema<IStockTransfer>(
  {
    transferNo: {
      type: String,
      required: true,
      unique: true,
    },
    fromBranchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    toBranchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "IN_TRANSIT", "RECEIVED", "CANCELLED"],
      default: "PENDING",
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const transferItemSchema = new Schema<ITransferItem>(
  {
    transferId: {
      type: Schema.Types.ObjectId,
      ref: "StockTransfer",
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
  },
  { timestamps: true }
);

export const StockTransfer = mongoose.model<IStockTransfer>("StockTransfer", stockTransferSchema);
export const TransferItem = mongoose.model<ITransferItem>("TransferItem", transferItemSchema);
