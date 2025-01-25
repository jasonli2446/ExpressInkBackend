const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAI } = require("openai");
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');

require('dotenv').config();

//set app running on port 8000
const app = express();
const port = 8000;

app.use(bodyParser.json());
app.use(cors());

const openai = new OpenAI({
  baseURL: "https://api.omnistack.sh/openai/v1", 
  apiKey: "REPLACE ME",  
});

//have to use multer.diskStorage to save the file in order to actually display it to the frontend, otherwise only alt text will be displayed
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // new filename is the date _ og file name
    cb(null, Date.now() + "_" + path.extname(file.originalname));
  }
});

//storage is defined above
const upload = multer({ storage: storage });

// Route: handle image upload
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filename = req.file.filename;
  const filePath = `/uploads/${filename}`; 

  res.json({ 
    message: 'File uploaded successfully.', 
    imagePath: filePath 
  });

  console.log(`Received image upload from backend. File name: ${filename}`);
  
  // Convert file to base64 for Omnistack (openai) vision call
  const base64Image = fs.readFileSync(req.file.path).toString('base64');
  getOpenAICompletion(base64Image);
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const system_prompt = `You are a helpful image analysis bot. You will be provided with an image and your goal is to extract the sentiment_rating of the image (either very positive, positive, neutral, negative, or very negative). 
Provide a short reasoning_text for the reason you chose that certain sentiment rating. Then, provide a detected_objects, which is a list of as many different objects you can detect in the image. 
The output should have JSON fields of sentiment_rating, reasoning_text, and detected_objects.
Examples of output would be: {
  "sentiment_rating": "happy",
  "reasoning_text": "The person is smiling and appears relaxed. Their posture is open and positive.",
  "detected_objects": [
    "cat",
    "coffee cup",
    "laptop",
    "book"
  ]
}
for another one
{
  "sentiment_rating": "negative",
  "reasoning_text": "The person's brow is furrowed and their fists are clenched. They are standing rigidly with tense body language.",
  "detected_objects": [
    "desk",
    "phone",
    "keyboard",
    "pen"
  ]
}

`;

async function getOpenAICompletion(base64String) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
            "role": "system", 
            "content": system_prompt
        },
        {
            "role": "user", 
            "content": [
              {
                "type": "image_url",
                "image_url": {
                  "url": `data:image/jpeg;base64,${base64String}`
                }
              }
            ]
        }
    ],
    model: "expressInk4omini",
    response_format: { type: "json_object" },
    max_tokens: 300
  });
  
  console.log("Full API Response:", completion);
  const responseContent = JSON.parse(completion.choices[0].message.content);
  console.log("Parsed Response:", responseContent);
  console.log(JSON.stringify(responseContent));
  return responseContent;
} catch (error) {
  console.error("Detailed Error:", JSON.stringify(error, null, 2));
  throw error;
}
}




// start the server to get the image
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);

});


