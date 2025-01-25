const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAI } = require("openai");
const cors = require('cors');
const bodyParser = require('body-parser');

require('dotenv').config();

//set app running on port 8000
const app = express();
const port = 8000;

app.use(bodyParser.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route to handle image upload
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  const base64Image = req.file.buffer.toString('base64');
  res.json({ base64Image });
});

async function getOpenAICompletion() {
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
                          "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
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

