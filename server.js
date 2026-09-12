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

    // استخراج عناصر الأنمي ذكياً من صور المصغرات
    $('img').each((index, element) => {
      const imgUrl = $(element).attr('src') || $(element).attr('data-src') || '';
      
      if (imgUrl.includes('/uploads/') || imgUrl.includes('thumb')) {
        const parentA = $(element).closest('a');
        const parentDiv = $(element).closest('div');
        
        const link = parentA.attr('href') || '';
        let title = parentA.attr('title') || $(element).attr('alt') || parentDiv.find('.title, h2, h3, span').text().trim();
        
        title = title.replace(/\s+/g, ' ').trim();
        const fullImage = imgUrl.startsWith('http') ? imgUrl : `${TARGET_URL}${imgUrl}`;
        const fullLink = link.startsWith('http') ? link : `${TARGET_URL}${link}`;

        if (title && title.length > 2) {
          items.push({
            id: items.length + 1,
            title: title,
            image: fullImage,
            link: fullLink
          });
        }
      }
    });

    // إزالة التكرار إن وجد
    const uniqueItems = items.filter((item, index, self) =>
      index === self.findIndex((t) => t.title === item.title)
    );

    res.json({ success: true, count: uniqueItems.length, data: uniqueItems });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
