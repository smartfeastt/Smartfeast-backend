import mongoose from 'mongoose';

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
          required: true,
        },
        itemName: { type: String, required: true },
        itemPrice: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
        itemPhoto: String,
        outletId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Outlet',
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
    collection: 'Carts',
  }
);

const Cart = mongoose.models.Cart || mongoose.model('Cart', CartSchema);
export { Cart };

