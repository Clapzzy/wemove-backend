const mongoose = require("mongoose")

const comment = new mongoose.Schema({
  user: {
    type: String,
    require: true
  },
  userPfp: {
    type: String,
    default: ""
  },
  displayName: {
    type: String,
    default: ""
  },
  message: {
    type: String,
    required: true,
  },
  datePosted: {
    type: Date
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [String]
})

const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.SchemaTypes.ObjectId,
  },
  username: {
    type: String
  },
  userPfp: {
    type: String
  },
  text: {
    type: String,
  },
  challengeDesc: {
    type: String
  },
  challengeId: {
    type: mongoose.Schema.ObjectId
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
    type: Number,
  },
  comments: [comment],
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [mongoose.SchemaTypes.ObjectId]

})

module.exports = {
  posts: mongoose.model("posts", postSchema),
  comment: mongoose.model("comment", comment)
}
