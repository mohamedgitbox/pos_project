import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Branch, User, Product, Inventory, Counter } from "./models";

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pos_project";
  await mongoose.connect(MONGODB_URI);

  await Promise.all([
    Branch.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const branches = await Branch.insertMany([
    { name: "Main Branch", type: "retail", location: "123 Main St", phone: "555-0101" },
    { name: "Downtown Branch", type: "retail", location: "456 Downtown Ave", phone: "555-0102" },
    { name: "Airport Branch", type: "transit", location: "789 Airport Terminal", phone: "555-0103" },
  ]);

  const mainBranchId = branches[0]._id;

  const hashedPasswords = await Promise.all([
    bcrypt.hash("Admin123!", 10),
    bcrypt.hash("Manager123!", 10),
    bcrypt.hash("Cashier123!", 10),
  ]);

  await User.insertMany([
    { name: "Admin", email: "admin@pos.com", password: hashedPasswords[0], role: "ADMIN", branchId: null },
    { name: "Manager", email: "manager@pos.com", password: hashedPasswords[1], role: "MANAGER", branchId: mainBranchId },
    { name: "Cashier", email: "cashier@pos.com", password: hashedPasswords[2], role: "CASHIER", branchId: mainBranchId },
  ]);

  const productNames = [
    "Wireless Mouse", "USB-C Cable", "Laptop Stand", "Mechanical Keyboard",
    "Monitor Arm", "Webcam HD", "Desk Lamp", "Mouse Pad XL",
    "HDMI Cable", "USB Hub", "Power Strip", "Screen Cleaner",
    "Phone Stand", "Cable Organizer", "Wrist Rest", "Headphone Stand",
    "Ethernet Adapter", "Bluetooth Speaker", "Portable Charger", "Stylus Pen",
    "Laptop Sleeve", "USB Flash Drive", "SD Card Reader", "Surge Protector", "Ergonomic Chair Cushion",
  ];

  const products = await Product.insertMany(
    productNames.map((name) => {
      const costPrice = Math.floor(Math.random() * 450) + 50;
      const multiplier = 1.3 + Math.random() * 0.5;
      const sellingPrice = Math.round(costPrice * multiplier * 100) / 100;
      return {
        name,
        SKU: `PRD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        barcode: `${Math.floor(Math.random() * 9000000000000) + 1000000000000}`,
        costPrice: new mongoose.Types.Decimal128(costPrice.toString()),
        sellingPrice: new mongoose.Types.Decimal128(sellingPrice.toString()),
      };
    })
  );

  const inventoryDocs = [];
  for (const product of products) {
    for (const branch of branches) {
      inventoryDocs.push({
        productId: product._id,
        branchId: branch._id,
        quantity: Math.floor(Math.random() * 91) + 10,
        minLevel: Math.floor(Math.random() * 16) + 5,
      });
    }
  }
  await Inventory.insertMany(inventoryDocs);

  await Counter.insertMany([
    { _id: "invoiceNo", seq: 0 },
    { _id: "poNumber", seq: 0 },
    { _id: "transferNo", seq: 0 },
  ]);

  console.log("Seed complete:");
  console.log(`  Branches: ${branches.length}`);
  console.log(`  Users: 3`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Inventory records: ${inventoryDocs.length}`);
  console.log(`  Counters: 3`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
