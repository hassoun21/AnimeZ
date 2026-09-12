const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = 3000;
const TARGET_URL = 'https://animezid.cam';

app.get('/api/home', async (req, res) => {
  console.log('🔍 جاري طلب الصفحة من Animezid...');
  
  try {
    const { data } = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const items = [];

    $('img').each((index, element) => {
      const src = $(element).attr('src');
      const alt = $(element).attr('alt');
      if (src && alt && src.includes('uploads')) {
        items.push({
          id: items.length + 1,
          title: alt,
          image: src
        });
      }
    });

    console.log(`✅ تم العثور على ${items.length} عنصر بصورة وعنوان.`);
    res.json({ success: true, count: items.length, data: items });

  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
// مسار لجلب تفاصيل وحلقات الأنمي
app.get('/api/anime-episodes', async (req, res) => {
  const animeUrl = req.query.url;
  if (!animeUrl) {
    return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
  }

  try {
    const { data } = await axios.get(animeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const episodes = [];

    // استخراج الحلقات بناءً على الفئات الشائعة في مواقع الأنمي
    $('.episodes-list a, .les-eps a, ul.episodes li a, .ep-item a').each((index, element) => {
      const title = $(element).text().trim();
      const link = $(element).attr('href');
      if (link) {
        episodes.push({ title, link });
      }
    });

    res.json({ success: true, count: episodes.length, episodes });
  } catch (error) {
    console.error('❌ خطأ في جلب الحلقات:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);
});