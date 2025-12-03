import mongoose from 'mongoose';

const FavoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'Favorites',
  }
);

// Ensure one user can only favorite a restaurant once
FavoriteSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', FavoriteSchema);
export { Favorite };

