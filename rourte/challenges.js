const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const challenges = require("../model/challanges");
const { user, userChallenge } = require('../model/user');

router.get("/random", async (req, res) => {
  try {

    console.log("using")
    const allowedTimeframes = ["daily", "weekly", "monthly"]
    let timeframe = req.query.timeframe
    let numberOfChallenges = req.query.numberOfChallenges

    if (!allowedTimeframes.includes(timeframe)) {
      return res.status(400).send({
        message: "Invalid timeframe query parameter"
      })
    }

    if (!timeframe) {
      timeframe = "daily"
    }

    const foundChallenges = await challenges.find({ typeTimeFrame: timeframe })
    const returnChallenges = []

    if (foundChallenges.length < numberOfChallenges) {
      return res.status(400).send({
        message: "Invalid numberOfChallenges number"
      })
    }

    if (!numberOfChallenges) { numberOfChallenges = 1 }
    for (let index = 1; index <= numberOfChallenges; index++) {
      let num = Math.floor(Math.random() * foundChallenges.length)
      returnChallenges.push(foundChallenges[num])
      foundChallenges.splice(num, 1)
    }
    return res.send(returnChallenges)
  } catch (error) {
    return res.status(400).send(error)
  }
})

router.get("/", async (req, res) => {
  try {
    const username = req.query.username
    const today = new Date();

    if (username == undefined) {
      return res.status(400).send({ message: "Invalid username ( is undefined)" })
    }

    const userData = await user.findOne({ username: username }, { refreshToken: 0, salt: 0, hash: 0, email: 0, updatedAt: 0 })
    if (userData == null) {
      return res.status(400).send({ message: `0 found users with username : ${username}` })
    }


    if (userData.weeklyChallenges.length == 0) {

      await user.updateOne({ username: username }, { $set: { weeklyChallenges: [] } })
      const foundChallenges = await challenges.aggregate([
        { $match: { typeTimeFrame: 'weekly' } },
        { $sample: { size: 1 } }
      ])
      const chalToAdd = new userChallenge()

      const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
      const unixTimeNextWeekStart = Math.floor(nextWeek.getTime());

      const allChallenges = []

      chalToAdd.type = 'weekly'
      chalToAdd.description = foundChallenges[0].description
      chalToAdd.dueDate = unixTimeNextWeekStart
      chalToAdd.challengeId = foundChallenges[0]['_id']
      allChallenges.push(chalToAdd)
      await user.updateOne({ username: username }, { $set: { weeklyChallenges: [...allChallenges] } })
    }

    if (userData.dailyChallenges.length == 0) {

      await user.updateOne({ username: username }, { $set: { dailyChallenges: [] } })

      const foundChallenges = await challenges.aggregate([
        { $match: { typeTimeFrame: 'daily' } },
        { $sample: { size: 2 } }
      ])

      const nextDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const unixTimeNextDayStart = Math.floor(nextDay.getTime());
      const allChallenges = []

      for (let i = 0; i < foundChallenges.length; i++) {
        const chalToAdd = new userChallenge()
        chalToAdd.type = 'daily'
        chalToAdd.description = foundChallenges[i].description
        chalToAdd.dueDate = unixTimeNextDayStart
        chalToAdd.challengeId = foundChallenges[i]['_id']

        allChallenges.push(chalToAdd)
      }

      console.log(allChallenges)
      await user.updateOne({ username: username }, { $set: { dailyChallenges: [...allChallenges] } })
    }

    return res.status(200).send({ dailyChallenges: userData.dailyChallenges, weeklyChallenges: userData.weeklyChallenges })
  } catch (error) {
    return res.status(400).send({
      message: error.message
    })
  }
})

router.post("/", async (req, res) => {
  try {
    const challenge = new challenges()

    challenge.description = req.body.description
    challenge.difficulty = req.body.difficulty
    challenge.type = req.body.type
    challenge.typeTimeFrame = req.body.typeTimeFrame

    await challenge.save()
    return res.status(201).send({
      message: "Challenge successfully created"
    })
  } catch (error) {
    return res.status(400).send({
      message: error
    })
  }
})

module.exports = router;
