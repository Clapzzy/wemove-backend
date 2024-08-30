const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const posts = require("../model/posts");

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
    const imageName = helperFunctions.randomImageName(64, req.file.originalname)

    const params = {
      Bucket: bucketName,
      Key: imageName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }

    const command = new PutObjectCommand(params)

    await s3.send(command)
    const post = new posts()

    post.userId = req.body.userId
    post.description = req.body.description
    post.datePosted = new Date()
    post.attachmentType = "photo"
    post.attachmentName = imageName
    post.attachmentUrl = ""

    await post.save()
    return res.status(201).send({ message: "post was succsesfully created" })

  } catch (error) {
    console.log(error)
    res.status(400).send({ message: error })
  }
})

router.get('/getPosts', async (req, res) => {
  try {

    //const postsGotten = await posts.find({}).limit(10)
    //const getObjectParams = {
    //  Bucket: bucketName,
    //  Key: postsGotten[4].attachmentName,
    //}
    //const command = new GetObjectCommand(getObjectParams);
    //const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    //postsGotten[4]["attachmentUrl"] = url

    return res.status(200).send(postsGotten)

  } catch (error) {
    return res.status(400).send({ message: error })
  }
})

module.exports = router;
