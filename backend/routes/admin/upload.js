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
      bucket: process.env.OSS_BUCKET || 'nbbb'
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
    const fileType = req.file.mimetype.startsWith('video/') ? 'videos' : 'images';
    const uploadFolder = folder === 'media' ? fileType : folder;
    const fileName = generateFileName(req.file.originalname);
    const objectName = `${uploadFolder}/${fileName}`;

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
        mimeType: req.file.mimetype,
        type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
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

// 获取OSS配置信息（供前端直传使用）
router.get('/oss-config', (req, res) => {
  try {
    // 生成临时访问凭证
    const config = {
      region: getOSSClient().options.region,
      bucket: getOSSClient().options.bucket,
      // 注意：不要直接返回 accessKeyId 和 accessKeySecret
      // 这里只是示例，生产环境应该使用 STS 临时凭证
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取OSS配置失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '获取配置失败: ' + error.message }
    });
  }
});

module.exports = router;


