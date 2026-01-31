const express = require('express');
const router = express.Router();
const OSS = require('ali-oss');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const miniprogramAuth = require('../../middleware/miniprogramAuth');

// 配置OSS客户端
const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET || 'nbbb'
});

// 配置 multer 用于处理文件上传（仅支持图片）
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为10MB（小程序场景下图片通常较小）
  },
  fileFilter: (req, file, cb) => {
    // 仅接受图片文件
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持上传图片文件 (jpeg, jpg, png, gif, webp)'));
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

// 上传单个图片（需要小程序用户认证）
router.post('/image', miniprogramAuth, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: { code: 400, message: '图片大小超过限制（最大10MB）' }
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

    // 小程序上传的图片统一放在 miniprogram/images/ 目录下
    const folder = 'miniprogram/images';
    const fileName = generateFileName(req.file.originalname);
    const objectName = `${folder}/${fileName}`;

    // 上传到OSS
    const result = await ossClient.put(objectName, req.file.buffer, {
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
    console.error('小程序上传图片失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '上传失败: ' + error.message }
    });
  }
});

// 上传多个图片（需要小程序用户认证）
router.post('/images', miniprogramAuth, (req, res, next) => {
  upload.array('images', 9)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: { code: 400, message: '图片大小超过限制（最大10MB）' }
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: { code: 400, message: '上传图片数量超过限制（最多9张）' }
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
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: '没有上传文件' }
      });
    }

    const folder = 'miniprogram/images';
    const uploadPromises = req.files.map(async (file) => {
      const fileName = generateFileName(file.originalname);
      const objectName = `${folder}/${fileName}`;

      const result = await ossClient.put(objectName, file.buffer, {
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
    console.error('小程序批量上传图片失败:', error);
    res.status(500).json({
      success: false,
      error: { code: 500, message: '批量上传失败: ' + error.message }
    });
  }
});

module.exports = router;

