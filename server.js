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

// المسار المعدل لجلب رابط المشاهدة بدقة عالية
app.get('/api/watch', async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ success: false, message: 'رابط غير صالح' });

  try {
    // التأكد من تحويل الرابط إلى صفحة التشغيل play.php
    let playUrl = targetUrl.replace('watch.php', 'play.php');

    const response = await axios.get(playUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let embedUrl = '';

    // البحث عن أول iframe متاح في الصفحة
    $('iframe').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('ads') && !src.includes('analytics')) {
        embedUrl = src;
        return false; // الخروج من الحلقة عند العثور على أول رابط حقيقي
      }
    });

    // إذا لم يتم العثور على iframe، نبحث في روابط التشغيل البديلة
    if (!embedUrl) {
      const altSource = $('video source').attr('src') || $('.server-item').attr('data-url');
      if (altSource) embedUrl = altSource;
    }

    // القاعدة الذهبية: إذا استعصى استخراج الرابط، نمرر رابط صفحة التشغيل نفسها لعرضها مباشرة كحاسوب
    if (!embedUrl) {
      embedUrl = playUrl;
    }

    if (embedUrl.startsWith('//')) {
      embedUrl = 'https:' + embedUrl;
    } else if (!embedUrl.startsWith('http')) {
      embedUrl = `${TARGET_URL}${embedUrl}`;
    }

    return res.json({ success: true, embedUrl });

  } catch (err) {
    // في حال الخطأ، نعيد رابط الصفحة الأصلية مباشرة لضمان عدم ظهور رسالة الخطأ للمستخدم
    let fallbackUrl = req.query.url.replace('watch.php', 'play.php');
    return res.json({ success: true, embedUrl: fallbackUrl });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
