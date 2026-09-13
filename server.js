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

    $('.servers-list li, .server-item, [data-server], .load-server').each((i, el) => {
      let serverName = $(el).text().trim();
      let serverId = $(el).attr('data-id') || $(el).attr('data-server') || i;
      if (serverName) {
        servers.push({ name: serverName, id: serverId });
      }
    });

    if (servers.length === 0) {
      servers.push({ name: 'السيرفر الرئيسي (افتراضي)', id: 'default' });
    }

    res.json({ success: true, playUrl, servers });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب السيرفرات' });
  }
});

// مسار جلب رابط الفيديو المباشر وتجنب الشاشة السوداء
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
    let videoLink = '';

    // البحث داخل وسائط الـ video أو source مباشرة
    $('video source, audio source, source').each((i, el) => {
      let src = $(el).attr('src');
      if (src && (src.includes('.mp4') || src.includes('m3u8') || src.includes('stream'))) {
        videoLink = src;
        return false;
      }
    });

    // إذا لم نجد source، نبحث عن روابط داخل الـ iframes أو نأخذ الرابط الخارجي
    if (!videoLink) {
      $('iframe').each((i, el) => {
        let src = $(el).attr('src') || $(el).attr('data-src');
        if (src && !src.includes('ads') && !src.includes('analytics')) {
          videoLink = src;
          return false;
        }
      });
    }

    if (!videoLink) {
      videoLink = playUrl;
    }

    if (videoLink.startsWith('//')) {
      videoLink = 'https:' + videoLink;
    } else if (!videoLink.startsWith('http')) {
      videoLink = `${TARGET_URL}${videoLink}`;
    }

    res.json({ success: true, embedUrl: videoLink });
  } catch (err) {
    res.json({ success: true, embedUrl: playUrl });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
