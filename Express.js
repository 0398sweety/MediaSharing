const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Set up AWS credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Set up S3 instance
const s3 = new AWS.S3();

// Set up DynamoDB instance
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION
});

// Set up Multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET request to retrieve data from database
app.get('/', (req, res) => {
  // Retrieve data from database and pass it to EJS template
  res.render('index', { data: data });
});

// POST request to add data to database
app.post('/', upload.single('image'), (req, res) => {
  // Create a new item in DynamoDB table with data from form
  const flickId = uuidv4();
  const params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      flickId: flickId,
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      imageUrl: `https://${process.env.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${flickId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  dynamodb.put(params, (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error adding data to database');
    } else {
      // Upload image to S3 bucket
      const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: flickId,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      };
      s3.upload(params, (err, data) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error uploading image to S3');
        }
