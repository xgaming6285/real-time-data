import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 10000, // Starting demo balance
  },
  equity: {
    type: Number,
    required: true,
    default: 10000,
  },
  margin: {
    type: Number,
    required: true,
    default: 0,
  },
  freeMargin: {
    type: Number,
    required: true,
    default: 10000,
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
    default: 100, // 1:100 leverage
  },
}, { timestamps: true });

// Calculate derived fields before saving
AccountSchema.pre('save', function() {
  // Free margin = Equity - Margin
  this.freeMargin = this.equity - this.margin;
  
  // Margin level = (Equity / Margin) * 100 (only if margin > 0)
  this.marginLevel = this.margin > 0 ? (this.equity / this.margin) * 100 : 0;
});

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);

