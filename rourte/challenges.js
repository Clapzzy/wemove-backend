const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const challenges = require("../model/challanges");
const challanges = require('../model/challanges');

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
