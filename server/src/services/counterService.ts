import { Counter } from "../models";

const prefixes: Record<string, string> = {
  invoiceNo: "INV-",
  poNumber: "PO-",
  transferNo: "TR-",
};

export async function getNextSequence(name: "invoiceNo" | "poNumber" | "transferNo"): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const prefix = prefixes[name] || "";
  const padded = String(counter.seq).padStart(6, "0");
  return `${prefix}${padded}`;
}
