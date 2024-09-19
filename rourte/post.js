const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const posts = require("../model/posts");
const { user } = require('../model/user')

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URL)
require("dotenv").config();

const multer = require('multer')
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
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
    console.log(req.file)
    console.log(req.body)
    const challengeId = req.body.challengeId
    const username = req.body.username
    const imageName = helperFunctions.randomImageName(64)
    const buffer = Buffer.from(req.body.image, "base64")
    const datePosted = Math.floor(new Date().getTime() / 1000)

    const params = {
      Bucket: bucketName,
      Key: imageName,
      Body: buffer,
      ContentType: 'image/jpeg'
    }

    const command = new PutObjectCommand(params)

    await s3.send(command)
    const post = new posts()

    post.userId = req.body.userId
    post.text = req.body.description
    post.datePosted = datePosted
    post.attachmentType = "photo"
    post.attachmentName = imageName
    post.attachmentUrl = ""

    const result = await user.updateOne(
      { username: username, 'dailyChallenges.challengeId': challengeId },
      { $set: { 'dailyChallenges.$.completed': true } }
    );
    const result2 = await user.updateOne({ username: username }, { $push: { doneChallenges: post } })
    await post.save()
    return res.status(201).send({ message: "post was succsesfully created" })

  } catch (error) {
    console.log(error)
    res.status(400).send({ message: error })
  }
})

router.get('/', async (req, res) => {
  try {
    const postUrls = []

    const postsGotten = await posts.find({}).limit(4)
    for (const post in postsGotten) {
      console.log(postsGotten[post]['attachmentName'])
      const getObjectParams = {
        Bucket: bucketName,
        Key: postsGotten[post]['attachmentName'],
      }
      const command = new GetObjectCommand(getObjectParams);
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      postUrls.push(url)
      postsGotten[post]["attachmentUrl"] = url
    }

    return res.status(200).send(postsGotten)

  } catch (error) {
    console.log(error)
    return res.status(400).send({ message: error })
  }
})

module.exports = router;
