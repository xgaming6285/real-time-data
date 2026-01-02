import mongoose from 'mongoose';

// Helper function to generate account number synchronously
function generateAccountNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return 'ACC-' + Array.from({ length: 6 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}

/**
 * TradingAccount represents a logical trading account that contains both live and demo modes.
 * A user can have multiple trading accounts, each with its own live and demo balances.
 */
const TradingAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Account name is required'],
    maxlength: [50, 'Account name cannot exceed 50 characters'],
    default: 'Main Account',
  },
  accountNumber: {
    type: String,
    unique: true,
    required: true,
    default: generateAccountNumber, // Use synchronous default function
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true,
  },
  color: {
    type: String,
    default: '#3b82f6', // Default blue color for account identification
  },
}, { timestamps: true });

// Compound index for efficient queries
TradingAccountSchema.index({ userId: 1, isActive: 1 });
TradingAccountSchema.index({ userId: 1, createdAt: -1 });

// Pre-save hook to ensure account number uniqueness
// If there's a collision (very rare), regenerate
TradingAccountSchema.pre('save', async function() {
  if (this.isNew && this.accountNumber) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const existing = await mongoose.models.TradingAccount?.findOne({ 
        accountNumber: this.accountNumber,
        _id: { $ne: this._id }
      });
      
      if (!existing) {
        break; // Account number is unique
      }
      
      // Regenerate account number
      this.accountNumber = generateAccountNumber();
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique account number');
    }
  }
});

// Static method to ensure only one active account per user
TradingAccountSchema.statics.setActive = async function(userId: mongoose.Types.ObjectId, accountId: mongoose.Types.ObjectId) {
  // Deactivate all accounts for this user
  await this.updateMany(
    { userId, _id: { $ne: accountId } },
    { $set: { isActive: false } }
  );
  
  // Activate the specified account
  await this.updateOne(
    { _id: accountId, userId },
    { $set: { isActive: true } }
  );
};

// Static method to get or create the default account for a user
TradingAccountSchema.statics.getOrCreateDefault = async function(userId: mongoose.Types.ObjectId) {
  let account = await this.findOne({ userId, isActive: true });
  
  if (!account) {
    // Check if user has any accounts
    account = await this.findOne({ userId }).sort({ createdAt: 1 });
    
    if (!account) {
      // Create a default account
      account = await this.create({
        userId,
        name: 'Main Account',
        isActive: true,
      });
    } else {
      // Activate the first account
      account.isActive = true;
      await account.save();
    }
  }
  
  return account;
};

// Delete cached model if it exists to ensure schema changes are picked up
if (mongoose.models.TradingAccount) {
  delete mongoose.models.TradingAccount;
}

export default mongoose.model('TradingAccount', TradingAccountSchema);
