const mongoose = require("mongoose")

const comment = new mongoose.Schema({
  user: {
    type: mongoose.SchemaTypes.ObjectId
  },
  text: {
    type: String,
    required: true,
  },
  datePosted: {
    type: Date
  }
})

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
  },
  text: {
    type: String,
  },
  challengeDesc: {
    type: String
  },
  attachmentType: {
    type: String,
  },
  attachmentUrl: {
    type: String
  },
  attachmentName: {
    type: String
  },
  datePosted: {
    type: BigInt,
  },
  comments: [comment],
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [mongoose.SchemaTypes.ObjectId]

})

module.exports = mongoose.model("posts", postSchema)

