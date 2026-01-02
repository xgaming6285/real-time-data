import mongoose from 'mongoose';

export type OrderType = 'buy' | 'sell';
export type OrderStatus = 'open' | 'closed' | 'cancelled';

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: false, // Allow null for legacy orders
    index: true,
  },
  symbol: {
    type: String,
    required: [true, 'Symbol is required'],
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: [true, 'Order type is required'],
  },
  volume: {
    type: Number,
    required: [true, 'Volume is required'],
    min: [0.01, 'Minimum volume is 0.01'],
  },
  entryPrice: {
    type: Number,
    required: [true, 'Entry price is required'],
  },
  currentPrice: {
    type: Number,
    default: 0,
  },
  stopLoss: {
    type: Number,
    default: null,
  },
  takeProfit: {
    type: Number,
    default: null,
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'cancelled'],
    default: 'open',
    index: true,
  },
  profit: {
    type: Number,
    default: 0,
  },
  closePrice: {
    type: Number,
    default: null,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  margin: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Calculate profit before saving
OrderSchema.methods.calculateProfit = function(currentPrice: number): number {
  if (this.status !== 'open') return this.profit;
  
  const priceDiff = this.type === 'buy' 
    ? currentPrice - this.entryPrice 
    : this.entryPrice - currentPrice;
  
  // Standard lot size for forex is 100,000 units
  // Profit = (Price Difference) * Volume * 100,000
  const lotSize = 100000;
  return priceDiff * this.volume * lotSize;
};

// Index for efficient queries
OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, accountId: 1, status: 1 });

// Delete cached model if it exists to ensure schema changes are picked up
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model('Order', OrderSchema);

