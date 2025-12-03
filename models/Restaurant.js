import mongoose from 'mongoose';

const RestaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    outlets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet',
      },
    ],
    outlet_count: {
      type: Number,
      default: 3, // default limit of outlets
      min: 1,
    },
    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'Restaurants',
  }
);

const Restaurant =
  mongoose.models.Restaurant ||
  mongoose.model('Restaurant', RestaurantSchema);

export { Restaurant };
