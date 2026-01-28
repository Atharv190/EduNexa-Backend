import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    summary: {
      title: String,
      overview: String,
      keyPoints: [String],
      importantTerms: [String],
      conclusion: String,
    },
    quiz: [
      {
        question: String,
        options: [String],
        answer: String,
      },
    ],
  },
  { timestamps: true }
);

const File = mongoose.model("File", fileSchema);

export default File;
