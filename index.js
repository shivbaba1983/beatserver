import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import bodyParser from 'body-parser';
import cors from "cors"
const PORT = 5000;
import fs from 'fs';
import path from 'path';
//const todayDate = new Date().toISOString().slice(0, 10);;

//const FILE_PATH = `./volumeData_${todayDate}.json`;
//const fileRoutes = require("./routes/files");
//import fileRoutes from '.routes/files';
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

const getTodayInEST = (isFileName) => {
  const estDate = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York"
  });

  const date = new Date(estDate);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return isFileName? `${year}-${month}-${day}`: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};


app.get('/api/files', (req, res) => {
  fs.readdir("./LogData", (err, files) => {
    if (err) return res.status(500).json({ error: "Error reading directory" });

    const filenames = files.map(file => {
      const name = file.split(".").slice(0, -1).join(".");
      return name;
    });

    res.json({ files: filenames });
  });
});



app.get('/api/hello', (req, res) => {
  console.log('API hit!');
  res.json({ message: 'Hello from Express!' });
});

app.get('/api/volume/:fileName', (req, res) => {
  const { fileName} = req.params;
  const tempFilePath = `./LogData/${fileName}.json`;
  let data = {};
  if (fs.existsSync(tempFilePath)) {
    data = JSON.parse(fs.readFileSync(tempFilePath));
  }
  res.json(data);
});

// API to add new entry
app.post('/api/volume', (req, res) => {
  const { callVolume, putVolume, selectedTicker } = req.body;
  const tempFilePath = `./LogData/${getTodayInEST(true)}.json`;
  if (!fs.existsSync(tempFilePath)) {
    fs.writeFileSync(tempFilePath, JSON.stringify([]));
  }
  const currentData = JSON.parse(fs.readFileSync(tempFilePath));

  const newEntry = {
    id: currentData.length + 1,
    timestamp: getTodayInEST(false),
    callVolume,
    putVolume,
    selectedTicker
  };


  currentData.push(newEntry);
  fs.writeFileSync(tempFilePath, JSON.stringify(currentData, null, 2));
  res.json(newEntry);
});



app.get('/api/options/:symbol/:assetclass/:selected', async (req, res) => {
  const { symbol, assetclass, selected } = req.params;
  console.warn('assetclass', assetclass)
  console.warn('selected', selected)
  let tempUrl;
  if (selected === 'day' && (assetclass === 'ETF')) {
    const today = new Date();
    let todayDate = '2025-04-21';//today.toISOString().slice(0, 10);
    if (symbol === "TQQQ" || symbol === "SOXL" || symbol === "TSLL" || symbol === "SQQQ")
      todayDate = "2025-04-25"
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
  console.log(`✅ Server running on port ${PORT}`);
});
