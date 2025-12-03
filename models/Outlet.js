import mongoose from 'mongoose';

const OutletSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
    managers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    menuIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu',
      },
    ],
    location: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
      fullAddress: { type: String, trim: true },
    },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'Outlets',
  }
);

const Outlet = mongoose.models.Outlet || mongoose.model('Outlet', OutletSchema);
export { Outlet };
