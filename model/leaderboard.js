const mongoose = require("mongoose")

const leaderboardSchema = new mongoose.Schema({
  name: {
    type: String
  },
  score: {
    type: String
  },
  typeOfChallenge: {
    type: String
  }
})


module.exports = mongoose.model("leaderboard", leaderboardSchema)
