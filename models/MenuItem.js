import mongoose from 'mongoose';

const MenuItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    itemQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    itemPhoto: {
      type: String, // URL from Supabase or any image host
      trim: true,
    },
    itemDescription: {
      type: String,
      trim: true,
    },
    category: {
      type: String, // e.g., "Beverages", "Desserts"
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet', // link to outlet that owns this menu item
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'MenuItems',
  }
);

const MenuItem =
  mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema);

export { MenuItem };
