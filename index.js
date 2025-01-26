const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAI } = require("openai");
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');

require('dotenv').config();

// Set app running on port 8000
const app = express();
const port = 8000;

app.use(bodyParser.json());
app.use(cors());

const openai = new OpenAI({
  baseURL: "https://api.omnistack.sh/openai/v1", 
  apiKey: "osk_affaa27921fd4472e2a838726b57a714",  
});

// Use multer.diskStorage to save the file in order to display it to the frontend
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // New filename is the date + original file extension
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Route: Handle image upload
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filename = req.file.filename;
  const filePath = `/uploads/${filename}`;
  try {
    console.log(`Received image upload from backend. File name: ${filename}`);

    // Convert the image to base64 so Omnistack can use it
    const base64Image = fs.readFileSync(req.file.path).toString('base64');

    // Get the OpenAI response
    const aiResponse = await getOpenAICompletion(base64Image);

    if (aiResponse) {
      saveAnalysisToFile(aiResponse);
    }

    res.json({ 
      message: 'File uploaded successfully.', 
      imagePath: filePath,
      aiResponse: aiResponse
    });
  } catch (error) {
    console.error("Error during image processing:", error);
    res.status(500).send("Error processing the image with AI.");
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const system_prompt = `You are a helpful image analysis bot. You will be provided with an image and your goal is to extract the sentiment_rating of the image (either very positive, positive, neutral, negative, or very negative). 
Provide a short reasoning_text for the reason you chose that certain sentiment rating. Then, provide a detected_objects, which is a list of as many different objects you can detect in the image. 
The output should have JSON fields of sentiment_rating, reasoning_text, and detected_objects.
Provide a detected_objects, which is a list of as many different objects you can detect in the image. 
The output should have JSON fields of sentiment_rating and detected_objects.
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
    return responseContent;
  } catch (error) {
    console.error("Detailed Error:", JSON.stringify(error, null, 2));
    throw error;
  }
}

const drawingPrompts = [
  "Draw a picture of yourself with your family. How do you feel in the picture?",
  "Draw a house where you feel safe. What does it look like? Who is with you?",
  "Draw a picture of your favorite place to relax. How does it make you feel?",
  "Draw a picture of a time you felt really happy. What were you doing?",
  "Draw a picture of how your day has been today. What colors or shapes do you use?",
  "Draw something that represents a challenge or problem you're facing right now.",
  "Draw a picture of your favorite thing to do when you're feeling sad. What helps you feel better?",
  "Draw a picture of a friend or someone you trust. What are they doing?",
  "Draw something that makes you feel brave or strong.",
  "Draw a picture of something you are looking forward to doing."
];

// Function to choose a random prompt from the list provided
function getRandomPrompt() {
  return drawingPrompts[Math.floor(Math.random() * drawingPrompts.length)];
}

app.get('/prompt-of-the-day', (req, res) => {
  const prompt = getRandomPrompt();
  res.json({ prompt: prompt });
});

// Function to save analysis to file
function saveAnalysisToFile(aiResponse) {
  const filePath = path.join(__dirname, 'sentiment_analysis.json');

  // Read the existing file if it exists
  let analyses = [];
  if (fs.existsSync(filePath)) {
    const fileData = fs.readFileSync(filePath);
    analyses = JSON.parse(fileData);
  }

  const timestamp = new Date().toISOString();
  // Push new data into the array
  const sentimentAnalysis = {
    sentiment_rating: aiResponse.sentiment_rating.toLowerCase(),
    detected_objects: aiResponse.detected_objects,
    time_stamp: timestamp
  };
  analyses.push(sentimentAnalysis);

  fs.writeFileSync(filePath, JSON.stringify(analyses, null, 2));
}

app.get('/json-history', (req, res) => {
  const filePath = path.join(__dirname, 'sentiment_analysis.json');
  
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath);
      const analyses = JSON.parse(fileData);
      res.json(analyses);
    } else {
      res.status(404).send({ error: "No json history file found" });
    }
  } catch (error) {
    console.error("Error reading history file", error);
    res.status(500).send({ error: "Error 500: Error getting sentiment analysis history" });
  }
});



// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
