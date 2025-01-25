const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

//To do: make an env file for the openai api key (or omnistack??)
require('dotenv').config();


//set app running on port 3000
const app = express();
const port = process.env.PORT || 3000;