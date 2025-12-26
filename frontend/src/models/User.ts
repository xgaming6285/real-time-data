import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email for this user.'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password for this user.'],
    minlength: [6, 'Password cannot be less than 6 characters'],
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this user.'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);

