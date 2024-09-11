const express = require('express');
const router = express.Router();

const helperFunctions = require("../helperFunctions")
const user = require('../model/user');

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

router.get("/search", async (req, res) => {
  try {
    console.log('searching ')
    const searchKeyword = req.query.searchKeyword
    const lastId = req.query.lastId
    if (searchKeyword == '' || searchKeyword == null) {
      return res.status(200).send([])
      //    return res.status(400).send({ message: 'Search input should not be empty!!!' })
    }

    const regexPattern = new RegExp(searchKeyword, 'i')

    if (lastId == null || lastId == '') {
      const users = await user.find({ 'username': { $regex: regexPattern } }, { username: 1, displayName: 1, picture: 1, pictureName: 1, pictureUrl: 1 }).sort({ _id: 1 }).limit(3)
      for (const user in users) {
        if (users[user]['pictureName'] != "Default") {
          const getObjectParams = {
            Bucket: bucketName,
            Key: users[user]["pictureName"]
          }
          const command = new GetObjectCommand(getObjectParams);
          const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
          users[user]["pictureUrl"] = url
        }
      }
      return res.status(201).send(users)
    }

    const users = await user.find({ 'username': { $regex: regexPattern }, _id: { $gt: lastId } }, { username: 1, displayName: 1, picture: 1, }).sort({ _id: 1 }).limit(3)

    return res.status(201).send(users)

  } catch (error) {
    return res.status(400).send({ message: error })
  }
})

router.post("/changeProfilePicture", upload.single("image"), async (req, res) => {
  try {
    console.log(req.file)
    console.log(req.body)

    const imageName = helperFunctions.randomImageName(64)
    const buffer = Buffer.from(req.body.image, "base64")

    const params = {
      Bucket: bucketName,
      Key: imageName,
      Body: buffer,
      ContentType: 'image/jpeg'
    }

    const command = new PutObjectCommand(params)
    await s3.send(command)

    const somebody = await user.updateOne({ username: req.body.username }, { pictureName: imageName })

    return res.status(201).send({ message: "post was succsesfully created" })

  } catch (error) {
    console.log(error)
    res.status(400).send({ message: error })
  }
})

router.post('/login', async (req, res) => {
  let foundUser = await user.findOne({ email: req.body.email })
  if (foundUser === null) {
    return res.status(400).send({
      message: "User not found."
    });
  }
  else {
    if (foundUser.validatePassword(req.body.password)) {
      return res.status(201).send({
        message: "User found.",
      })
    }
    else {
      return res.status(400).send({
        message: "Invalid Password"
      })
    }
  }
})

router.post('/signup', upload.single('image'), async (req, res) => {
  try {
    let newUser = new user();

    newUser.username = req.body.username
    newUser.email = req.body.email
    newUser.displayName = req.body.displayName
    newUser.birthday = req.body.birthday

    console.log(req.body.image)

    newUser.SetPassword(req.body.password);
    const access_token = helperFunctions.generateToken({ userId: newUser._id })
    const refresh_token = helperFunctions.generateRefreshToken({ userId: newUser._id })
    newUser.refreshToken = refresh_token
    await newUser.save()
    return res.status(201).send({
      access_token: access_token,
      refresh_token: refresh_token,
      message: "User created successfully."
    });
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      message: "Falied to create a user",
      'error': error
    })
  }
});

module.exports = router;
