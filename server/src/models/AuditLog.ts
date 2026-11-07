import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "CREATE",
      "UPDATE",
      "DELETE",
      "LOGIN",
      "LOGOUT",
      "CHECKOUT",
      "INVENTORY_ADJUST",
      "RECEIVE",
      "TRANSFER_SHIP",
      "TRANSFER_RECEIVE",
    ],
  },
  entityType: {
    type: String,
    required: true,
    index: true,
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  before: {
    type: Schema.Types.Mixed,
  },
  after: {
    type: Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
  },
});

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
