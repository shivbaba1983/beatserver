import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import bodyParser from 'body-parser';
import cors from "cors"
const PORT = 5000;
import fs from 'fs';
import path from 'path';
const FILE_PATH = './volumeData.json';

const app = express();
app.use(cors()); // Enable CORS for frontend requests
app.use(bodyParser.json());

function getFridayOfCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // Sunday - Saturday : 0 - 6
  const diffToFriday = 5 - dayOfWeek;
  const friday = new Date(today);
  friday.setDate(today.getDate() + diffToFriday);
  return friday.toISOString().slice(0, 10);;
}

if (!fs.existsSync(FILE_PATH)) {
  fs.writeFileSync(FILE_PATH, JSON.stringify([]));
}

app.get('/api/hello', (req, res) => {
  console.log('API hit!');
  res.json({ message: 'Hello from Express!' });
});

app.get('/api/volume', (req, res) => {
  const data = JSON.parse(fs.readFileSync(FILE_PATH));
  res.json(data);
});

// API to add new entry
app.post('/api/volume', (req, res) => {
  const { callVolume, putVolume, selectedTicker } = req.body;
  const currentData = JSON.parse(fs.readFileSync(FILE_PATH));

  const newEntry = {
    id: currentData.length + 1,
    timestamp: new Date().toISOString(),
    callVolume,
    putVolume,
    selectedTicker
  };

  currentData.push(newEntry);
  fs.writeFileSync(FILE_PATH, JSON.stringify(currentData, null, 2));
  res.json(newEntry);
});



app.get('/api/options/:symbol/:assetclass/:selected', async (req, res) => {
  const { symbol, assetclass, selected } = req.params;
  console.warn('assetclass', assetclass)
  console.warn('selected', selected)
  let tempUrl;
  if (selected === 'day' && (assetclass === 'ETF')) {
    const today = new Date();
    const todayDate = '2025-04-21';//today.toISOString().slice(0, 10);
    tempUrl = `https://api.nasdaq.com/api/quote/${symbol}/option-chain?assetclass=${assetclass}&limit=100&fromdate=${todayDate}`
  }
  else if (selected === 'day' && assetclass === 'stocks') {
    const fridayDate = '2025-04-25';//getFridayOfCurrentWeek();
    console.warn('fridayDate', fridayDate)
    tempUrl = `https://api.nasdaq.com/api/quote/${symbol}/option-chain?assetclass=${assetclass}&limit=100&fromdate=${fridayDate}`
  }
  else {
    //const fridayDate = getFridayOfCurrentWeek();
    tempUrl = `https://api.nasdaq.com/api/quote/${symbol}/option-chain?assetclass=${assetclass}`;
  }

  try {
    const response = await axios.get(tempUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Referer': `https://www.nasdaq.com/market-activity/stocks/${symbol}/option-chain`,
        'Origin': 'https://www.nasdaq.com'
      }
    });
    res.json(response?.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Nasdaq options data' });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
