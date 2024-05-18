const express = require("express")
const router = express.Router()

const leaderboard = require("../model/leaderboard")

router.post("/", async (req, res) => {
  try {
    const item = new leaderboard()

    item.name = req.body.name
    item.score = req.body.score
    item.phoneNum = req.body.num
    item.typeOfChallenge = req.body.type

    await item.save()
    return res.status(200).send({ message: "Leaderboard item added!" })



  } catch (error) {
    return res.status(400).send({ message: error })
  }
})

router.get("/", async (req, res) => {
  try {
    const typesOfChallenges = ['licevi', 'koremni', 'klekove', 'kolelo']
    let type = req.query.type
    if (!type || !typesOfChallenges.includes(type)) {
      return res.status(400).send({ message: "Invalid challenge type!!" })
    }
    const responseData = await leaderboard.find({ typeOfChallenge: type }).sort({ score: -1 }).limit(10)
    return res.status(200).send(responseData)
  } catch (error) {
    return res.status(400).send({ message: error })
  }
})

module.exports = router
