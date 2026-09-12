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

// نقطة لفحص حالة السيرفر وتجنب خمول Render
app.get('/', (req, res) => {
  res.json({ success: true, message: 'AnimeZ API is running perfectly!' });
});

// جلب قائمة الأنميات والصفحة الرئيسية
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

// جلب رابط التشغيل المباشر واستخراج السيرفرات (مثل صفحة play.php)
app.get('/api/watch', async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ success: false, message: 'رابط غير صالح' });

  try {
    // التحويل التلقائي لصفحة المشاهدة والتحكم
    let playUrl = targetUrl.replace('watch.php', 'play.php');

    const response = await axios.get(playUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    let embedUrl = '';

    // البحث عن الـ iframe الأساسي للمشاهدة
    const iframeSrc = $('iframe').attr('src') || $('iframe').attr('data-src');
    if (iframeSrc) {
      embedUrl = iframeSrc.startsWith('//') ? `https:${iframeSrc}` : (!iframeSrc.startsWith('http') ? `${TARGET_URL}${iframeSrc}` : iframeSrc);
    }

    // إذا لم يوجد iframe، نبحث عن أزرار أو روابط السيرفرات الداخلية
    if (!embedUrl) {
      let altLink = $('video source').attr('src') || $('.server-item').attr('data-url');
      if (altLink) {
        embedUrl = altLink.startsWith('//') ? `https:${altLink}` : altLink;
      }
    }

    if (embedUrl) {
      return res.json({ success: true, embedUrl });
    } else {
      return res.json({ success: false, message: 'لم يتم العثور على سيرفر مشاهدة شغال' });
    }

  } catch (err) {
    return res.status(500).json({ success: false, message: 'خطأ في جلب بيانات صفحة التشغيل' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
