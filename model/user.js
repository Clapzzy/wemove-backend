const mongoose = require('mongoose');
const crypto = require('crypto');
const { type } = require('os');

const challengeSchema = new mongoose.Schema({
  description: {
    type: String,
    require: true,
  },
  type: {
    type: String,
    require: true
  },
  dueDate: {
    type: Date,
    require: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 0,
    default: 0,
  },
  challengeID: {
    type: Number,
  }
})

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  display_name: {
    type: String,
    required: true,
    unique: false
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true
  },
  birthday: {
    type: Date,
    required: true,
    unique: false
  },
  picture: {
    type: String,
    default: "Default"
  },
  hash: {
    type: String,
  },
  salt: {
    type: String,
  },
  refreshToken: {
    type: String,
    required: true
  },
  weeklyChallenges: {
    type: [challengeSchema],
    default: []
  },
  dailyChallenges: {
    type: [challengeSchema],
    default: []
  },
  createdAt: {
    type: Date,
    immutable: true,
    default: () => Date.now(),
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
})





userSchema.methods.SetPassword = function(password) {

  this.salt = crypto.randomBytes(16).toString("hex")

  this.hash = crypto.pbkdf2Sync(password, this.salt, 1001, 64, "sha512").toString("hex")

}

userSchema.methods.validatePassword = function(password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 1001, 64, "sha512").toString("hex")
  return this.hash === hash
}


module.exports = mongoose.model("user", userSchema)
