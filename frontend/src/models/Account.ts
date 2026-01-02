import mongoose from 'mongoose';

export type AccountMode = 'live' | 'demo';

const AccountSchema = new mongoose.Schema({
  // Reference to the trading account (new - for multi-account support)
  tradingAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradingAccount',
    required: false, // Optional for backward compatibility during migration
    index: true,
  },
  // Legacy field - kept for backward compatibility, will be migrated
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Made optional - will use tradingAccountId going forward
    index: true,
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

// Compound unique index: one account per trading account per mode
// This replaces the old userId + mode unique index
AccountSchema.index({ tradingAccountId: 1, mode: 1 }, { unique: true, sparse: true });

// Legacy index for backward compatibility (will be removed after migration)
AccountSchema.index({ userId: 1, mode: 1 }, { sparse: true });

// Calculate derived fields before saving
AccountSchema.pre('save', function() {
  // Free margin = Equity - Margin
  this.freeMargin = this.equity - this.margin;
  
  // Margin level = (Equity / Margin) * 100 (only if margin > 0)
  this.marginLevel = this.margin > 0 ? (this.equity / this.margin) * 100 : 0;
});

// Static method to get or create account balances for a trading account
AccountSchema.statics.getOrCreateForTradingAccount = async function(
  tradingAccountId: mongoose.Types.ObjectId,
  mode: AccountMode
) {
  let account = await this.findOne({ tradingAccountId, mode });
  
  if (!account) {
    const defaultBalance = mode === 'demo' ? 10000 : 0;
    account = await this.create({
      tradingAccountId,
      mode,
      balance: defaultBalance,
      equity: defaultBalance,
      margin: 0,
      freeMargin: defaultBalance,
      marginLevel: 0,
      leverage: 30,
      isAutoLeverage: false,
      lastActiveAt: new Date(),
    });
  }
  
  return account;
};

// Delete cached model if it exists to ensure schema changes are picked up
if (mongoose.models.Account) {
  delete mongoose.models.Account;
}

export default mongoose.model('Account', AccountSchema);
