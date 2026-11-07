import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplierName: string;
  branchId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  totalCost: mongoose.Types.Decimal128;
  status: string;
}

export interface IPurchaseItem extends Document {
  poId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  orderedQty: number;
  unitCost: mongoose.Types.Decimal128;
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    totalCost: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"],
      default: "DRAFT",
    },
  },
  { timestamps: true }
);

const purchaseItemSchema = new Schema<IPurchaseItem>(
  {
    poId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    orderedQty: {
      type: Number,
      required: true,
      min: 1,
    },
    unitCost: {
      type: Schema.Types.Decimal128,
      required: true,
    },
  },
  { timestamps: true }
);

export const PurchaseOrder = mongoose.model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema);
export const PurchaseItem = mongoose.model<IPurchaseItem>("PurchaseItem", purchaseItemSchema);
