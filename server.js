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
  res.json({ success: true, message: 'AnimeZ API is running perfectly!' });
});

app.get('/api/home', async (req, res) => {
  try {
    const response = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const items = [];

    $('.story-item, .anime-card, .poster-card, a:has(img)').each((index, element) => {
      const img = $(element).find('img');
      const imgSrc = img.attr('src') || img.attr('data-src') || '';
      
      if (imgSrc && (imgSrc.includes('thumb') || imgSrc.includes('upload') || imgSrc.includes('image'))) {
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

// 1. مسار جلب قائمة السيرفرات المتاحة للحلقة
app.get('/api/servers', async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ success: false, message: 'رابط غير صالح' });

  try {
    let playUrl = targetUrl.replace('watch.php', 'play.php');
    const response = await axios.get(playUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const servers = [];

    // استخراج أزرار أو خيارات السيرفرات من الصفحة (مثل Megamax وغيرها)
    $('.servers-list li, .server-item, [data-server], .load-server').each((i, el) => {
      let serverName = $(el).text().trim();
      let serverId = $(el).attr('data-id') || $(el).attr('data-server') || i;
      if (serverName) {
        servers.push({ name: serverName, id: serverId });
      }
    });

    // إذا لم يتم العثور على قائمة سيرفرات محددة، نبحث عن الـ iframes المتاحة أو نضع السيرفر الافتراضي
    if (servers.length === 0) {
      servers.push({ name: 'سيرفر المشاهدة الرئيسي (Megamax)', id: 'default' });
    }

    res.json({ success: true, playUrl, servers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب السيرفرات' });
  }
});

// 2. مسار جلب رابط التشغيل الخاص بالسيرفر المختار
app.get('/api/watch', async (req, res) => {
  let playUrl = req.query.url;
  if (!playUrl) return res.status(400).json({ success: false, message: 'رابط غير صالح' });

  try {
    const response = await axios.get(playUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let embedUrl = '';

    $('iframe').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('ads') && !src.includes('analytics')) {
        embedUrl = src;
        return false;
      }
    });

    if (!embedUrl) {
      embedUrl = playUrl;
    }

    if (embedUrl.startsWith('//')) {
      embedUrl = 'https:' + embedUrl;
    } else if (!embedUrl.startsWith('http')) {
      embedUrl = `${TARGET_URL}${embedUrl}`;
    }

    res.json({ success: true, embedUrl });
  } catch (err) {
    res.json({ success: true, embedUrl: playUrl });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
