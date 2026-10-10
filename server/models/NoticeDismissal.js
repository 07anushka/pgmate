import mongoose from "mongoose";

const noticeDismissalSchema = new mongoose.Schema(
  {
    noticeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notice",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

noticeDismissalSchema.index(
  { noticeId: 1, userId: 1 },
  { unique: true }
);

export default mongoose.model(
  "NoticeDismissal",
  noticeDismissalSchema
);