import mongoose from 'mongoose';

const InventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Other',
    },
    currentStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unit: {
      type: String,
      enum: ['pieces', 'kg', 'grams', 'liters', 'ml', 'packets', 'boxes'],
      default: 'pieces',
    },
    costPerUnit: {
      type: Number,
      min: 0,
      default: 0,
    },
    supplier: {
      type: String,
      trim: true,
    },
    lastRestocked: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'Inventory',
  }
);

// Index for faster queries
InventorySchema.index({ outletId: 1, itemName: 1 });
InventorySchema.index({ outletId: 1, category: 1 });

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);
export { Inventory };
