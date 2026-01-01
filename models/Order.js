import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for guest orders
    },
    customerInfo: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outlet',
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
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
        quantity: { type: Number, required: true },
        itemPhoto: String,
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'wallet'],
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['pay_now', 'pay_later'],
      default: 'pay_now',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    orderNumber: {
      type: String,
      unique: true,
    },
    orderType: {
      type: String,
      enum: ['dine_in', 'takeaway', 'delivery'],
      required: true,
    },
    tableNumber: {
      type: String,
      default: null,
    },
    kotItems: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'MenuItem',
        },
        itemName: String,
        itemPrice: Number,
        quantity: Number,
        kotGenerated: {
          type: Boolean,
          default: false,
        },
        kotGeneratedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'Orders',
  }
);

// Generate order number before saving
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    // Generate unique order number
    let orderNumber;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      orderNumber = `ORD-${timestamp}-${random}`;
      
      const existing = await mongoose.model('Order').findOne({ orderNumber });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    this.orderNumber = orderNumber;
  }
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export { Order };

