import Decimal from 'decimal.js';
import mongoose from 'mongoose';

export function toDecimal128(value: string | number | Decimal): mongoose.Types.Decimal128 {
  const d = new Decimal(value.toString());
  return mongoose.Types.Decimal128.fromString(d.toFixed(2));
}

export function decimalAdd(a: string | number, b: string | number): string {
  return new Decimal(a.toString()).plus(new Decimal(b.toString())).toFixed(2);
}

export function decimalSub(a: string | number, b: string | number): string {
  return new Decimal(a.toString()).minus(new Decimal(b.toString())).toFixed(2);
}

export function decimalMul(a: string | number, b: string | number): string {
  return new Decimal(a.toString()).times(new Decimal(b.toString())).toFixed(2);
}

export function decimalDiv(a: string | number, b: string | number): string {
  return new Decimal(a.toString()).dividedBy(new Decimal(b.toString())).toFixed(2);
}

export function decimalGte(a: string | number, b: string | number): boolean {
  return new Decimal(a.toString()).greaterThanOrEqualTo(new Decimal(b.toString()));
}

export function decimalEq(a: string | number, b: string | number): boolean {
  return new Decimal(a.toString()).equals(new Decimal(b.toString()));
}

export function weightedAverageCost(existingQty: number, existingCost: string | number, newQty: number, newCost: string | number): string {
  const totalExisting = new Decimal(existingCost.toString()).times(existingQty);
  const totalNew = new Decimal(newCost.toString()).times(newQty);
  const totalQty = new Decimal(existingQty).plus(newQty);
  if (totalQty.isZero()) return '0.00';
  return totalExisting.plus(totalNew).dividedBy(totalQty).toFixed(2);
}