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
router.get("/single", async (req, res) => {
  try {
    //sigurno nqma da e zle ako davam comentarite kakto postovete i profilite, no za sega ne e problem, kato e samo tekst.

    const username = req.query.username
    const postId = req.query._id

    let postFound

    const userFound = await user.findOne({
      username: username
    })

    // ne znam kak do otkriq post-a samo s mongoose
    for (let i = 0; i < userFound.doneChallenges.length; i++) {
      if (userFound.doneChallenges[i]._id == postId) {
        postFound = userFound.doneChallenges[i]
        break
      }
    }

    if (!postFound) {
      return res.status(400).send({ message: "Post or User not found" })
    }

    //also not a great idea to have to populate the comments with pfps every time someone wants to see them
    //maybe using sql will solve the issue bc i am not using mongo correctly and just bending it to my needs
    console.log("amount of comments", postFound.comments.length)
    console.log(postFound.comments)
    if (postFound.comments.length >= 0) {
      for (let i = 0; i < postFound.comments.length; i + i) {
        console.log(postFound.comments[i].username)
        console.log("single comment", postFound[i])
        const populatedUser = await user.findOne({ username: postFound.comments[i].username })
        postFound[i].displayName = populatedUser.displayName
        if (populatedUser.pictureName != "Default") {
          const url = await helperFunctions.getImageUrlS3(populatedUser.pictureName)
          postFound[i].userPfp = url
        }

      }
    }

    return res.status(200).send(postFound)

  } catch (error) {
    console.log(error)
    res.status(400).send({ message: error })
  }
}
)

router.post("/likePost", async (req, res) => {
  try {
    const username = req.body.username
    const postId = req.body.postId
    const posterUsername = req.body.posterUsername
    let postFound

    const userFound = await user.findOne({
      username: req.body.posterUsername
    })

    for (let i = 0; i < userFound.doneChallenges.length; i++) {
      if (userFound.doneChallenges[i]._id == req.body.postId) {
        if (userFound.doneChallenges[i].likedBy.includes(req.body.username)) {
          userFound.doneChallenges[i].likes--
          userFound.doneChallenges[i].likedBy.pop(req.body.username)

          userFound.markModified("doneChallenges")
          await userFound.save()
          postFound = true
          break

        } else {
          userFound.doneChallenges[i].likes++
          userFound.doneChallenges[i].likedBy.push(req.body.username)

          userFound.markModified("doneChallenges")
          await userFound.save()
          postFound = true
          break
        }
      }
    }
    if (!postFound) {
      return res.status(400).send({ message: "Post to like not found" })
    }
    console.log(userFound)
    return res.status(200).send(userFound)

  } catch (error) {
    console.log(error)
    res.status(400).send({ message: error })
  }
})

router.post("/likeComment", async (req, res) => {
  //malumno e da izpolzvam username vmesto id. Nqkoj den trqbva da go opravq
  //nqma da e zle da moga da otkrivam post-a samo s _id-to 
  let commentFound

  const userFound = await user.findOne({
    username: req.body.posterUsername
  })

  for (let i = 0; i < userFound.doneChallenges.length; i++) {
    if (userFound.doneChallenges[i]._id == req.body.postId) {
      console.log(userFound.doneChallenges[i])
      for (let j = 0; j < userFound.doneChallenges[i].comments.length; j++) {
        if (userFound.doneChallenges[i].comments[j]._id == req.body.commentId) {
          //proverqva dali user-a go e laiknal i ako e maha like-a, inache go dobavq
          if (userFound.doneChallenges[i].comments[j].likedBy.includes(req.body.username)) {
            userFound.doneChallenges[i].comments[j].likes--
            userFound.doneChallenges[i].comments[j].likedBy.pop(req.body.username)

            userFound.markModified("doneChallenges")
            await userFound.save()
            commentFound = true
            break

          } else {
            userFound.doneChallenges[i].comments[j].likes++
            userFound.doneChallenges[i].comments[j].likedBy.push(req.body.username)

            userFound.markModified("doneChallenges")
            await userFound.save()
            commentFound = true
            break
          }
        }
      }
      if (!commentFound) {
        return res.status(400).send({ message: "Comment to like not found" })
      }
      break
    }
  }
  console.log(userFound)
  return res.status(200).send(userFound)

})

router.post("/comments", async (req, res) => {
  try {
    //nqma da e zle da proverqva dali posterUsername sushtestvuva
    //trqbva da napravq limit za dulzina na message i za post message kogato postvash
    let commentAdded = false

    const newComment = new comment()

    newComment.message = req.body.postMessage
    newComment.user = req.body.posterUsername
    newComment.datePosted = new Date().getTime() / 1000

    const userFound = await user.findOne(
      {
        username: req.body.username,
      }
    )

    //maj e zle. ne uspqh da go napravq samo s mongo findOneAndUpdate
    for (let i = 0; i < userFound.doneChallenges.length; i++) {
      if (userFound.doneChallenges[i]._id == req.body._id) {
        userFound.doneChallenges[i].comments.push(newComment)
        commentAdded = true
        userFound.markModified("doneChallenges")
        await userFound.save()
        break
      }
    }

    if (commentAdded === false) {
      return res.status(400).send({ message: "The post cant be found" })
    }


    return res.status(200).send(userFound)
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
          const url = await helperFunctions.getImageUrlS3(userFound.pictureName)
          postsFound[post]['userPfp'] = url
        }
        if (postsFound[post].attachmentName != '' || postsFound[post].attachmentName != null) {
          const url = await helperFunctions.getImageUrlS3(postsFound[post]["attachmentName"])
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
