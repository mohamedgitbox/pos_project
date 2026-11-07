import { Response } from "express";
import { ZodError } from "zod";

export interface IdName {
  id: string;
  name: string;
}

export interface ProductInfo {
  id: string;
  name: string;
  SKU: string;
  barcode: string;
}

export interface TransferDoc {
  _id: unknown;
  transferNo: string;
  fromBranchId: unknown;
  toBranchId: unknown;
  initiatedBy: unknown;
  status: string;
  note?: unknown;
  totalQuantity?: unknown;
  shippedBy?: unknown;
  shippedAt?: unknown;
  receivedBy?: unknown;
  receivedAt?: unknown;
  cancelledBy?: unknown;
  cancelledAt?: unknown;
  createdAt?: unknown;
}

export interface TransferItemDoc {
  _id: unknown;
  productId: unknown;
  quantity: unknown;
}

export interface SerializedTransferItem {
  _id: string;
  product: ProductInfo;
  quantity: number;
}

export interface SerializedTransferSummary {
  _id: string;
  transferNo: string;
  fromBranch: IdName;
  toBranch: IdName;
  initiatedBy: IdName;
  status: string;
  note: string;
  totalQuantity: number;
  shippedAt: string;
  receivedAt: string;
  cancelledAt: string;
  createdAt: string;
}

export interface SerializedTransferDetail extends SerializedTransferSummary {
  shippedBy: IdName;
  receivedBy: IdName;
  cancelledBy: IdName;
  items: SerializedTransferItem[];
}

function optionalString(value: unknown): string {
  return value == null ? "" : String(value);
}

export function dateValue(value: unknown): string {
  return value instanceof Date ? value.toISOString() : optionalString(value);
}

export function branchInfo(value: unknown): IdName {
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return { id: optionalString(obj._id), name: optionalString(obj.name) };
  }
  return { id: optionalString(value), name: "" };
}

export function productInfo(value: unknown): ProductInfo {
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return {
      id: optionalString(obj._id),
      name: optionalString(obj.name),
      SKU: optionalString(obj.SKU),
      barcode: optionalString(obj.barcode),
    };
  }
  return { id: optionalString(value), name: "", SKU: "", barcode: "" };
}

export function userInfo(value: unknown): IdName {
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    return { id: optionalString(obj._id), name: optionalString(obj.name ?? obj.email) };
  }
  return { id: optionalString(value), name: "" };
}

function isDuplicate(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === 11000;
}

export function fail(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({ success: false, error: "Validation failed", details: error.issues });
  }
  if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
    return res.status(409).json({ success: false, error: "Insufficient stock for one or more items" });
  }
  if (isDuplicate(error)) {
    return res.status(409).json({ success: false, error: "Duplicate transfer record" });
  }
  console.error(error);
  return res.status(500).json({ success: false, error: fallback });
}

export function serializeTransferSummary(transfer: TransferDoc): SerializedTransferSummary {
  return {
    _id: optionalString(transfer._id),
    transferNo: optionalString(transfer.transferNo),
    fromBranch: branchInfo(transfer.fromBranchId),
    toBranch: branchInfo(transfer.toBranchId),
    initiatedBy: userInfo(transfer.initiatedBy),
    status: optionalString(transfer.status),
    note: optionalString(transfer.note),
    totalQuantity: Number(transfer.totalQuantity ?? 0),
    shippedAt: dateValue(transfer.shippedAt),
    receivedAt: dateValue(transfer.receivedAt),
    cancelledAt: dateValue(transfer.cancelledAt),
    createdAt: dateValue(transfer.createdAt),
  };
}

export function serializeTransferDetail(transfer: TransferDoc, items: TransferItemDoc[]): SerializedTransferDetail {
  return {
    ...serializeTransferSummary(transfer),
    shippedBy: userInfo(transfer.shippedBy),
    receivedBy: userInfo(transfer.receivedBy),
    cancelledBy: userInfo(transfer.cancelledBy),
    items: items.map((item) => ({
      _id: optionalString(item._id),
      product: productInfo(item.productId),
      quantity: Number(item.quantity ?? 0),
    })),
  };
}