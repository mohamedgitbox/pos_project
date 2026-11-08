import mongoose, { ClientSession } from "mongoose";
import Decimal from "decimal.js";
import { Inventory, Product } from "../models";

export async function decrementStock(
  productId: mongoose.Types.ObjectId,
  branchId: mongoose.Types.ObjectId,
  qty: number,
  session?: ClientSession
): Promise<void> {
  const result = await Inventory.findOneAndUpdate(
    { productId, branchId, quantity: { $gte: qty } },
    { $inc: { quantity: -qty } },
    { session }
  );

  if (!result) {
    throw new Error("INSUFFICIENT_STOCK");
  }
}

export async function incrementStock(
  productId: mongoose.Types.ObjectId,
  branchId: mongoose.Types.ObjectId,
  qty: number,
  session?: ClientSession
): Promise<void> {
  await Inventory.findOneAndUpdate(
    { productId, branchId },
    { $inc: { quantity: qty } },
    { upsert: true, new: true, session }
  );
}

export async function updateCostPrice(
  productId: mongoose.Types.ObjectId,
  newUnitCost: mongoose.Types.Decimal128,
  qty: number
): Promise<void> {
  const product = await Product.findById(productId);
  if (!product) return;

  const inventoryDocs = await Inventory.find({ productId });
  const totalQty = inventoryDocs.reduce((sum, inv) => sum + inv.quantity, 0);

  const oldCost = new Decimal(product.costPrice.toString());
  const newCost = new Decimal(newUnitCost.toString());
  const totalQtyDec = new Decimal(totalQty);
  const qtyDec = new Decimal(qty);

  let weightedAvg: Decimal;
  if (totalQty > 0) {
    weightedAvg = oldCost.mul(totalQtyDec).add(newCost.mul(qtyDec)).div(totalQtyDec.add(qtyDec));
  } else {
    weightedAvg = newCost;
  }

  await Product.findByIdAndUpdate(productId, {
    costPrice: mongoose.Types.Decimal128.fromString(weightedAvg.toFixed(4)),
  });
}

export function calculateWeightedAverageCost(
  oldQty: number,
  oldCost: Decimal,
  newQty: number,
  newCost: Decimal
): Decimal {
  const totalQtyDec = new Decimal(oldQty);
  const qtyDec = new Decimal(newQty);

  if (totalQtyDec.isZero()) {
    return newCost;
  }

  return oldCost.mul(totalQtyDec).add(newCost.mul(qtyDec)).div(totalQtyDec.add(qtyDec));
}
