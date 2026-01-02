import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email for this user."],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password for this user."],
      minlength: [6, "Password cannot be less than 6 characters"],
    },
    name: {
      type: String,
      required: [true, "Please provide a name for this user."],
      maxlength: [60, "Name cannot be more than 60 characters"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    favoriteSymbols: {
      type: [String],
      default: [],
    },
    favoriteIndicators: {
      type: [String],
      default: [],
    },
    chartConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// If the model exists (e.g. from hot reload), verify it matches our expectations or delete it
// This is crucial for Next.js development where models persist across hot reloads
if (mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model("User", UserSchema);
