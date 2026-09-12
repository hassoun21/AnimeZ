const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.json());

const TARGET_URL = 'https://animezid.com';

app.get('/api/home', async (req, res) => {
  try {
    const { data } = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const $ = cheerio.load(data);
    const items = [];
    // جلب البيانات من الموقع
    $('.stories-container .story-item, .anime-card').each((index, element) => {
      const title = $(element).find('.title, h3').text().trim();
      const image = $(element).find('img').attr('src');
      const link = $(element).find('a').attr('href');
      if (title && link) {
        items.push({ id: index + 1, title, image, link });
      }
    });
    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
