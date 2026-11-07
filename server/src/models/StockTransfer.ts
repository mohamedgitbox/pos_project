import mongoose, { Schema, Document } from "mongoose";

export type TransferStatus = "PENDING" | "IN_TRANSIT" | "RECEIVED" | "CANCELLED";

export interface IStockTransfer extends Document {
  transferNo: string;
  fromBranchId: mongoose.Types.ObjectId;
  toBranchId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  status: TransferStatus;
  note?: string;
  totalQuantity: number;
  shippedBy?: mongoose.Types.ObjectId;
  shippedAt?: Date;
  receivedBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
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
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    shippedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    shippedAt: {
      type: Date,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    receivedAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: {
      type: Date,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

stockTransferSchema.index({ fromBranchId: 1, status: 1 });
stockTransferSchema.index({ toBranchId: 1, status: 1 });
stockTransferSchema.index({ createdAt: -1 });

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

transferItemSchema.index({ transferId: 1, productId: 1 }, { unique: true });

export const StockTransfer = mongoose.model<IStockTransfer>("StockTransfer", stockTransferSchema);
export const TransferItem = mongoose.model<ITransferItem>("TransferItem", transferItemSchema);
