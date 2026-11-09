import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import {
  Branch,
  User,
  Product,
  Inventory,
  Counter,
  StockTransfer,
  TransferItem,
} from "./models";

async function seed() {
  const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/pos_project";
  console.log(`\n🔌 Connecting to: ${MONGODB_URI}`);

  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Verify we're connected to PRIMARY
  if (mongoose.connection.db) {
    const admin = await mongoose.connection.db.admin();
    const status = await admin.serverStatus();
    console.log(`📊 MongoDB version: ${status.version}`);
  }

  console.log("\n🧹 Cleaning collections...");
  await Promise.all([
    Branch.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    TransferItem.deleteMany({}),
    StockTransfer.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log("✅ Collections cleared");

  console.log("\n🏪 Creating branches...");
  const branches = await Branch.insertMany([
    {
      name: "Main Branch",
      type: "retail",
      location: "123 Main St",
      phone: "555-0101",
    },
    {
      name: "Downtown Branch",
      type: "retail",
      location: "456 Downtown Ave",
      phone: "555-0102",
    },
    {
      name: "Airport Branch",
      type: "transit",
      location: "789 Airport Terminal",
      phone: "555-0103",
    },
  ]);
  console.log(`✅ Created ${branches.length} branches`);

  // Verify branches saved
  const branchesCount = await Branch.countDocuments();
  console.log(`📋 Branch count in DB: ${branchesCount}`);

  const mainBranchId = branches[0]._id;

  console.log("\n👥 Creating users...");
  const hashedPasswords = await Promise.all([
    bcrypt.hash("Admin123!", 10),
    bcrypt.hash("Manager123!", 10),
    bcrypt.hash("Cashier123!", 10),
  ]);

  await User.insertMany([
    {
      name: "Admin",
      email: "admin@pos.com",
      password: hashedPasswords[0],
      role: "ADMIN",
      branchId: null,
    },
    {
      name: "Manager",
      email: "manager@pos.com",
      password: hashedPasswords[1],
      role: "MANAGER",
      branchId: mainBranchId,
    },
    {
      name: "Cashier",
      email: "cashier@pos.com",
      password: hashedPasswords[2],
      role: "CASHIER",
      branchId: mainBranchId,
    },
  ]);
  console.log("✅ Created 3 users");

  console.log("\n📦 Creating products...");
  const productNames = [
    "Wireless Mouse",
    "USB-C Cable",
    "Laptop Stand",
    "Mechanical Keyboard",
    "Monitor Arm",
    "Webcam HD",
    "Desk Lamp",
    "Mouse Pad XL",
    "HDMI Cable",
    "USB Hub",
    "Power Strip",
    "Screen Cleaner",
    "Phone Stand",
    "Cable Organizer",
    "Wrist Rest",
    "Headphone Stand",
    "Ethernet Adapter",
    "Bluetooth Speaker",
    "Portable Charger",
    "Stylus Pen",
    "Laptop Sleeve",
    "USB Flash Drive",
    "SD Card Reader",
    "Surge Protector",
    "Ergonomic Chair Cushion",
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
        isDeleted: false,
      };
    }),
  );
  console.log(`✅ Created ${products.length} products`);

  console.log("\n📊 Creating inventory records...");
  const inventoryRecords = [];
  for (const branch of branches) {
    for (const product of products) {
      inventoryRecords.push({
        productId: product._id,
        branchId: branch._id,
        quantity: Math.floor(Math.random() * 90) + 10,
        minLevel: 10,
      });
    }
  }

  console.log(`📝 Preparing ${inventoryRecords.length} inventory records...`);
  console.log(`Sample record:`, inventoryRecords[0]);

  try {
    // Use ordered: false to continue even if some fail
    const result = await Inventory.insertMany(inventoryRecords, {
      ordered: false,
      lean: true,
    });
    console.log(`✅ insertMany returned ${result.length} results`);
  } catch (error: any) {
    console.error("❌ insertMany ERROR:", error.message);
    if (error.writeErrors) {
      console.error("Write errors:", error.writeErrors.slice(0, 3));
    }
    if (error.result?.writeErrors) {
      console.error(
        "Write errors (result):",
        error.result.writeErrors.slice(0, 3),
      );
    }
    throw error;
  }

  // Verify each branch has inventory
  for (const branch of branches) {
    const count = await Inventory.countDocuments({ branchId: branch._id });
    console.log(`📊 ${branch.name}: ${count} inventory records`);
  }

  console.log("\n🔢 Creating counters...");
  await Counter.insertMany([
    { _id: "invoiceNo", seq: 0 },
    { _id: "poNumber", seq: 0 },
    { _id: "transferNo", seq: 0 },
  ]);
  console.log("✅ Created 3 counters");

  console.log("\n========================================");
  console.log("📊 FINAL VERIFICATION:");
  console.log(`  Branches: ${await Branch.countDocuments()}`);
  console.log(`  Users: ${await User.countDocuments()}`);
  console.log(`  Products: ${await Product.countDocuments()}`);
  console.log(`  Inventory: ${await Inventory.countDocuments()}`);
  console.log(`  Counters: ${await Counter.countDocuments()}`);
  console.log("========================================");

  await mongoose.disconnect();
  console.log("\n🎉 Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌ SEED FAILED:");
  console.error(err);
  console.error("\nStack trace:", err.stack);
  process.exit(1);
});
