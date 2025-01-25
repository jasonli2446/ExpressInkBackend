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


const upload = multer({
  storage: multer.memoryStorage(), //for the multer buffer
});


// Route to handle image upload
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const base64Image = req.file.buffer.toString('base64');
  res.json({ message: 'File uploaded successfully.' });

  console.log(`Received image upload from backend: ${req.file.originalname}`);
  getOpenAICompletion(base64Image);
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


async function getOpenAICompletion(base64String) {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
              "role": "user",
              "content": [
                  {"type": "text", "text": "What's in this image?"},
                  {
                      "type": "image_url",
                      "image_url": {
                          "url": `data:image/jpeg;base64,${base64String}`,
                      },
                  },
              ],
          }
      ],
        model: "expressInk4omini",
      });
      console.log("OpenAI response:", completion.choices[0].message.content);
  } catch (error) {
    console.error("Error while calling OpenAI API:", error);
  }
}




// start the server to get the image
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);

});

//from openai vision api (reference for base64 image)
/*

[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "What is in this image?",
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                },
            ],
        }
    ],

*/