import mongoose from 'mongoose';

export type AccountMode = 'live' | 'demo';

const AccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  mode: {
    type: String,
    enum: ['live', 'demo'],
    required: true,
    default: 'live',
  },
  // Separate field to track when user last switched to this account
  // This won't be affected by regular account saves/updates
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  balance: {
    type: Number,
    required: true,
    default: function(this: { mode: AccountMode }) {
      return this.mode === 'demo' ? 10000 : 0;
    },
  },
  equity: {
    type: Number,
    required: true,
    default: function(this: { mode: AccountMode }) {
      return this.mode === 'demo' ? 10000 : 0;
    },
  },
  margin: {
    type: Number,
    required: true,
    default: 0,
  },
  freeMargin: {
    type: Number,
    required: true,
    default: function(this: { mode: AccountMode }) {
      return this.mode === 'demo' ? 10000 : 0;
    },
  },
  marginLevel: {
    type: Number,
    default: 0, // Percentage
  },
  currency: {
    type: String,
    default: 'USD',
  },
  leverage: {
    type: Number,
    default: 30, // 1:30 leverage (default)
  },
  isAutoLeverage: {
    type: Boolean,
    default: false, // Manual mode by default, user can switch to auto
  },
}, { timestamps: true });

// Compound unique index: one account per user per mode
AccountSchema.index({ userId: 1, mode: 1 }, { unique: true });

// Calculate derived fields before saving
AccountSchema.pre('save', function() {
  // Free margin = Equity - Margin
  this.freeMargin = this.equity - this.margin;
  
  // Margin level = (Equity / Margin) * 100 (only if margin > 0)
  this.marginLevel = this.margin > 0 ? (this.equity / this.margin) * 100 : 0;
});

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);

