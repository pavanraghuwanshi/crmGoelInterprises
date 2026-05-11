import mongoose, { Schema, Document } from "mongoose";

export interface ITrackAssetRecord extends Document {
  amount: number;
  description: string;
  images: string[];
  assetId: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const TrackAssetRecordSchema: Schema = new Schema(
  {
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    images: [{ type: String }],
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITrackAssetRecord>("TrackAssetRecord", TrackAssetRecordSchema);
