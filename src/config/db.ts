import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI as string;
    console.log(mongoURI,"jjjjjjjjjj")

    if (!mongoURI) {
      throw new Error("❌ MONGO_URI not found in .env");
    }

    await mongoose.connect(mongoURI);

    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};