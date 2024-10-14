const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const { posts, comment } = require("../model/posts");
const { user, userChallenge } = require('../model/user')

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL)
require("dotenv").config();

const multer = require('multer')
const { S3Client, PutObjectCommand, GetObjectCommand, GetObjectLockConfigurationCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const bucketName = process.env.BUCKET_NAME
const bucketRegion = process.env.BUCKET_REGION
const accessKey = process.env.ACCESS_KEY
const secretAccessKey = process.env.SECRET_ACCESS_KEY

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion
})

router.post("/add", upload.single("image"), async (req, res) => {
  try {
    const challengeId = req.body.challengeId
    const challengeDesc = req.body.challengeDesc
    const username = req.body.username
    const imageName = helperFunctions.randomImageName(64)
    const datePosted = Math.floor(new Date().getTime() / 1000)

    const userFound = await user.findOne({ username: username })

    //dobavi lastSreakCheck za da spestqvash vsicko tova
    const lastChallDateCompleted = new Date(userFound.doneChallenges[userFound.doneChallenges.length - 1].datePosted * 1000)
    lastChallDateCompleted.setHours(0, 0, 0, 0)
    const streakExpireDate = new Date(lastChallDateCompleted)
    streakExpireDate.setDate(streakExpireDate.getDate() + 2)
    if (new Date().getTime() > streakExpireDate.getTime()) {
      console.log("post1")
      console.log("deleted streak")
      userFound.dailyStreak = 1
      await userFound.save()
    } else if (new Date().getDate() != lastChallDateCompleted.getDate()) {
      console.log("post1")
      console.log("streak is up")
      console.log("current streak", userFound.dailyStreak)
      console.log(userFound.dailyStreak + 1)

      userFound.dailyStreak = userFound.dailyStreak + 1
      await userFound.save()
    } else {
      console.log("post1")
      console.log("ignore")
    }
    //moze da ima probllem is vremevite zoni **&*^&^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    await helperFunctions.uploadBase64ToS3(imageName, req.body.image)

    const post = new posts()

    post.text = req.body.description
    post.username = username
    post.challengeDesc = challengeDesc
    post.challengeId = challengeId
    post.datePosted = datePosted
    post.attachmentType = "photo"
    post.attachmentName = imageName
    post.attachmentUrl = ""


    const result = await user.updateOne(
      {
        username: username,
        $or: [
          { 'dailyChallenges.challengeId': challengeId },
          { 'weeklyChallenges.challengeId': challengeId }
        ]
      },
      {
        $set: {
          'dailyChallenges.$[elem].completed': true,
          'weeklyChallenges.$[elem].completed': true
        }
      },
      {
        arrayFilters: [{ 'elem.challengeId': challengeId }]
      }
    );
    const result2 = await user.updateOne({ username: username }, { $push: { doneChallenges: post } })
    //trqbva da da vikna user datata ot mongo samo vednuz, a ne 3 puti
    await post.save()
    return res.status(201).send({ message: "post was succsesfully created" })

  } catch (error) {
    console.log(error)
    res.status(400).send({ message: error })
  }
})
router.get("/comments", async (req,res) => {

)
router.post("/comments", async (req, res) => {
  try {
    const username = req.body.username
    const postId = req.body._id
    const posterUsername = req.body.posterUsername
    const postMessage = req.body.postMessage

    const newComment = new comment()

    newComment.message = req.body.postMessage
    newComment.user = req.body.posterUsername
    newComment.datePosted = new Date().getTime() / 1000

    const userFound = await user.findOneAndUpdate(
      {
        username: req.body.username,
        "doneChallenges._id": req.body._id
      },
      {
        $push: { 'doneChallenges.$.comments': newComment }
      },
      { new: true }
    )

  } catch (error) {
    console.log(error)
    res.status(400).send({ message: error })
  }
})

router.get('/user', async (req, res) => {
  try {
    const lastId = req.query.lastId
    const username = req.query.username

    if (lastId == null || lastId == '') {
      const postsFound = await posts.find({ username: username }).sort({ _id: -1 }).limit(5)

      for (const post in postsFound) {
        if (postsFound[post].attachmentName != '' || postsFound[post].attachmentName != null) {
          const getObjectParams = {
            Bucket: bucketName,
            Key: postsFound[post]["attachmentName"]
          }
          const command = new GetObjectCommand(getObjectParams);
          const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
          postsFound[post]["attachmentUrl"] = url
        }
      }
      return res.status(200).send(postsFound)
    }

    const postsFound = await posts.find({ _id: { $lt: lastId }, username: username }).sort({ _id: -1 }).limit(5)

    for (const post in postsFound) {
      if (postsFound[post].attachmentName != '' || postsFound[post].attachmentName != null) {
        const getObjectParams = {
          Bucket: bucketName,
          Key: postsFound[post]["attachmentName"]
        }
        const command = new GetObjectCommand(getObjectParams);
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        postsFound[post]["attachmentUrl"] = url
      }
    }
    return res.status(200).send(postsFound)

  } catch (error) {
    console.log(error)
    return res.status(400).send({ message: error })
  }
})
router.get('/', async (req, res) => {
  try {
    const lastId = req.query.lastId
    const postUrls = []

    if (lastId == null || lastId == '') {
      const postsFound = await posts.find({}).sort({ _id: -1 }).limit(5)

      for (const post in postsFound) {
        const userFound = await user.findOne({ username: postsFound[post]['username'] })
        postsFound[post]['username'] = userFound.username

        if (userFound.pictureName != 'Default') {
          const getObjectParams = {
            Bucket: bucketName,
            Key: userFound.pictureName
          }
          const command = new GetObjectCommand(getObjectParams)
          const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
          postsFound[post]['userPfp'] = url
        }
        if (postsFound[post].attachmentName != '' || postsFound[post].attachmentName != null) {
          const getObjectParams = {
            Bucket: bucketName,
            Key: postsFound[post]["attachmentName"]
          }
          const command = new GetObjectCommand(getObjectParams);
          const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
          postsFound[post]["attachmentUrl"] = url
        }
      }
      return res.status(200).send(postsFound)
    }

    const postsFound = await posts.find(
      { _id: { $lt: lastId } }
    ).sort({ _id: -1 }).limit(5)

    for (const post in postsFound) {
      const userFound = await user.findOne({ username: postsFound[post]['username'] })
      postsFound[post]['username'] = userFound.username

      if (userFound.pictureName != 'Default') {
        const getObjectParams = {
          Bucket: bucketName,
          Key: userFound.pictureName
        }
        const command = new GetObjectCommand(getObjectParams)
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
        postsFound[post]['userPfp'] = url
      }

      if (postsFound[post].attachmentName != '' || postsFound[post].attachmentName != null) {
        const getObjectParams = {
          Bucket: bucketName,
          Key: postsFound[post]["attachmentName"]
        }
        const command = new GetObjectCommand(getObjectParams);
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        postsFound[post]["attachmentUrl"] = url
      }
    }
    return res.status(200).send(postsFound)

  } catch (error) {
    console.log(error)
    return res.status(400).send({ message: error })
  }
})

module.exports = router;
