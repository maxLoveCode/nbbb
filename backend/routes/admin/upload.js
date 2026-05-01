const express = require('express');
const router = express.Router();
const OSS = require('ali-oss');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 延迟初始化 OSS 客户端（避免启动时缺少配置导致崩溃）
let ossClient = null;
function getOSSClient() {
  if (!ossClient) {
    if (!process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_ACCESS_KEY_SECRET) {
      throw new Error('OSS 配置缺失，请设置 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET 环境变量');
    }
    ossClient = new OSS({
      region: process.env.OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET || 'nbbb',
      secure: true,          // 强制 HTTPS，HTTP 在分片上传大文件时连接不稳定
      timeout: 120000,
      requestTimeout: 120000
    });
  }
  return ossClient;
}

// 配置 multer 用于处理文件上传（支持图片和视频）
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制文件大小为100MB（支持视频）
  },
  fileFilter: (req, file, cb) => {
    // 接受图片和视频文件
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持上传图片和视频文件 (jpeg, jpg, png, gif, webp, mp4, mov, avi, wmv, flv, webm)'));
    }
  }
});

// 生成唯一文件名
function generateFileName(originalName) {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

// 上传单个图片
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: '没有上传文件' }
      });
    }

    // 从请求中获取目录路径，默认为 images/
    const folder = req.body.folder || 'images';
    const fileName = generateFileName(req.file.originalname);
    const objectName = `${folder}/${fileName}`;

    // 上传到OSS
    const result = await getOSSClient().put(objectName, req.file.buffer, {
      headers: {
        'Content-Type': req.file.mimetype,
        'Cache-Control': 'public, max-age=31536000'
      }
    });

    res.json({
      success: true,
      data: {
        url: result.url,
        name: result.name,
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      message: '上传成功'
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '上传失败: ' + error.message }
    });
  }
});

// 上传多个图片
router.post('/images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: '没有上传文件' }
      });
    }

    const folder = req.body.folder || 'images';
    const uploadPromises = req.files.map(async (file) => {
      const fileName = generateFileName(file.originalname);
      const objectName = `${folder}/${fileName}`;

      const result = await getOSSClient().put(objectName, file.buffer, {
        headers: {
          'Content-Type': file.mimetype,
          'Cache-Control': 'public, max-age=31536000'
        }
      });

      return {
        url: result.url,
        name: result.name,
        size: file.size,
        mimeType: file.mimetype
      };
    });

    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      data: results,
      message: '批量上传成功'
    });
  } catch (error) {
    console.error('批量上传图片失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '批量上传失败: ' + error.message }
    });
  }
});

// 删除图片
router.delete('/image', async (req, res) => {
  try {
    const { objectName } = req.body;

    if (!objectName) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: '缺少 objectName 参数' }
      });
    }

    await getOSSClient().delete(objectName);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '删除失败: ' + error.message }
    });
  }
});

// 上传视频
router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: '没有上传文件' }
      });
    }

    const folder = req.body.folder || 'videos';
    const fileName = generateFileName(req.file.originalname);
    const objectName = `${folder}/${fileName}`;

    // 上传到OSS
    const result = await getOSSClient().put(objectName, req.file.buffer, {
      headers: {
        'Content-Type': req.file.mimetype,
        'Cache-Control': 'public, max-age=31536000'
      }
    });

    res.json({
      success: true,
      data: {
        url: result.url,
        name: result.name,
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      message: '上传成功'
    });
  } catch (error) {
    console.error('上传视频失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '上传失败: ' + error.message }
    });
  }
});

// 上传文件（通用，支持图片和视频）
// 图片用普通 put；视频用分片上传（multipartUpload），避免大文件超时
router.post('/file', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: { code: 400, message: '文件大小超过限制（最大100MB）' }
          });
        }
        return res.status(400).json({
          success: false,
          error: { code: 400, message: '文件上传错误: ' + err.message }
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 400, message: err.message || '文件上传失败' }
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: '没有上传文件' }
      });
    }

    const folder = req.body.folder || 'media';
    const isVideo = req.file.mimetype.startsWith('video/');
    const fileType = isVideo ? 'videos' : 'images';
    const uploadFolder = folder === 'media' ? fileType : folder;
    const fileName = generateFileName(req.file.originalname);
    const objectName = `${uploadFolder}/${fileName}`;

    const client = getOSSClient();
    let resultUrl, resultName;

    if (isVideo) {
      // 视频使用分片上传：每片 2MB，5 路并发，彻底解决大文件超时
      const multiResult = await client.multipartUpload(objectName, req.file.buffer, {
        partSize: 2 * 1024 * 1024,   // 每片 2MB
        parallel: 5,                  // 5 路并发
        mime: req.file.mimetype,
        headers: {
          'Cache-Control': 'public, max-age=31536000'
        }
      });
      resultName = multiResult.name;
      resultUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${multiResult.name}`;
    } else {
      // 图片用普通 put（体积小，不需要分片）
      const putResult = await client.put(objectName, req.file.buffer, {
        headers: {
          'Content-Type': req.file.mimetype,
          'Cache-Control': 'public, max-age=31536000'
        }
      });
      resultName = putResult.name;
      resultUrl = putResult.url;
    }

    res.json({
      success: true,
      data: {
        url: resultUrl,
        name: resultName,
        size: req.file.size,
        mimeType: req.file.mimetype,
        type: isVideo ? 'video' : 'image'
      },
      message: '上传成功'
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '上传失败: ' + error.message }
    });
  }
});


// 获取文件列表
router.get('/list', async (req, res) => {
  try {
    const { prefix = '', marker = '', maxKeys = 100 } = req.query;

    const result = await getOSSClient().list({
      prefix: prefix || '',
      marker: marker || '',
      'max-keys': parseInt(maxKeys) || 100
    });

    const files = (result.objects || []).map(obj => {
      const isVideo = /\.(mp4|mov|avi|wmv|flv|webm)$/i.test(obj.name);
      const isImage = /\.(jpeg|jpg|png|gif|webp)$/i.test(obj.name);
      
      return {
        name: obj.name,
        url: `https://${getOSSClient().options.bucket}.${getOSSClient().options.region}.aliyuncs.com/${obj.name}`,
        size: obj.size,
        lastModified: obj.lastModified,
        type: isVideo ? 'video' : (isImage ? 'image' : 'other')
      };
    });

    // 按上传时间倒序排列（最新的在前面）
    files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    res.json({
      success: true,
      data: {
        files,
        nextMarker: result.nextMarker || null,
        isTruncated: result.isTruncated || false
      },
      message: '获取文件列表成功'
    });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '获取文件列表失败: ' + error.message }
    });
  }
});

// OSS PostObject 直传签名
// 前端拿到签名后直接 POST 到 OSS，不经过服务器带宽
// GET /api/admin/upload/sign?folder=videos&filename=xxx.mp4&mimeType=video/mp4
router.get('/sign', (req, res) => {
  try {
    const crypto = require('crypto');
    const { folder = 'images', filename, mimeType = 'application/octet-stream' } = req.query;

    if (!filename) {
      return res.status(400).json({ success: false, error: { message: '缺少 filename 参数' } });
    }

    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    const bucket = process.env.OSS_BUCKET || 'nbbb';
    const region = process.env.OSS_REGION || 'oss-cn-hangzhou';

    // 生成唯一对象名
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    const hash = crypto.randomBytes(16).toString('hex');
    const objectName = `${folder}/${Date.now()}-${hash}${ext}`;

    // Policy 有效期 30 分钟
    const expireDate = new Date(Date.now() + 30 * 60 * 1000);
    const policyObj = {
      expiration: expireDate.toISOString(),
      conditions: [
        { bucket },
        ['content-length-range', 0, 500 * 1024 * 1024], // 最大 500MB
        ['eq', '$key', objectName]
      ]
    };

    const policyBase64 = Buffer.from(JSON.stringify(policyObj)).toString('base64');
    const signature = crypto
      .createHmac('sha1', accessKeySecret)
      .update(policyBase64)
      .digest('base64');

    const host = `https://${bucket}.${region}.aliyuncs.com`;

    res.json({
      success: true,
      data: {
        host,
        objectName,
        accessKeyId,
        policy: policyBase64,
        signature,
        contentType: mimeType,
        // 上传完成后的访问 URL
        url: `${host}/${objectName}`
      }
    });
  } catch (error) {
    console.error('生成上传签名失败:', error);
    res.status(500).json({ success: false, error: { message: '签名失败: ' + error.message } });
  }
});

module.exports = router;


