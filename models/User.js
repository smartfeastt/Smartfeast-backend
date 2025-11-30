import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'user'],
      required: true,
    },
    ownedRestaurants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
      },
    ],
    managedOutlets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outlet',
      },
    ],
  },
  {
    timestamps: true,
    collection: 'Users',
  }
);

// Compound unique index: one email can have multiple roles
// This allows the same email to exist with different roles (user, owner, manager)
UserSchema.index({ email: 1, role: 1 }, { unique: true, name: 'email_1_role_1' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export { User };
