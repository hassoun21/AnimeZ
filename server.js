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

app.get('/', (req, res) => {
  res.send('AnimeZ API is running!');
});

// مسار جلب قائمة الأنميات
app.get('/api/home', async (req, res) => {
  try {
    const response = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const items = [];

    $('.story-item, .anime-card, .poster-card, a:has(img)').each((index, element) => {
      const img = $(element).find('img');
      const imgSrc = img.attr('src') || img.attr('data-src') || '';
      
      if (imgSrc && (imgSrc.includes('thumb') || imgSrc.includes('upload'))) {
        const title = $(element).attr('title') || img.attr('alt') || $(element).text().trim();
        const link = $(element).attr('href') || '';

        if (title && title.length > 2) {
          items.push({
            id: index + 1,
            title: title.replace(/\s+/g, ' ').trim(),
            image: imgSrc.startsWith('http') ? imgSrc : `${TARGET_URL}${imgSrc}`,
            link: link.startsWith('http') ? link : `${TARGET_URL}${link}`
          });
        }
      }
    });

    res.json({ success: true, count: items.length, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// مسار جلب رابط مشغل الفيديو عند النقر على أنمي
app.get('/api/watch', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ success: false, message: 'URL is required' });

    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);
    let embedUrl = $('iframe').attr('src') || $('iframe').attr('data-src') || '';
    
    if (embedUrl && !embedUrl.startsWith('http')) {
      embedUrl = `https:${embedUrl}`;
    }

    res.json({ success: true, embedUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
