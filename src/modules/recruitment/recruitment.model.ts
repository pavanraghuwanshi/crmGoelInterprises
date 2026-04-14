import mongoose, { Schema, Document } from "mongoose";

export interface IRecruitment extends Document {
    candidateName: string;
    email: string;
    contactNumber: string;
    appliedPosition: string;
    interviewDate?: Date;
    interviewerName?: string;
    interviewerFeedback?: string;
    selectionStatus: string;
    resumes: string[]; // List of file URLs
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const RecruitmentSchema: Schema = new Schema(
    {
        candidateName: { type: String },
        email: { type: String },
        contactNumber: { type: String },
        appliedPosition: { type: String },
        interviewDate: { type: Date },
        interviewerName: { type: String },
        interviewerFeedback: { type: String },
        selectionStatus: { type: String, default: "Pending" },
        resumes: [{ type: String }],
        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

export default mongoose.model<IRecruitment>("Recruitment", RecruitmentSchema);
