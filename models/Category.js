import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'Categories',
  }
);

// Ensure unique category names per outlet
CategorySchema.index({ name: 1, outletId: 1 }, { unique: true });

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export { Category };
