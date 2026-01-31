# 登录链路日志记录指南

## 📋 概述

已为登录链路添加了完整的日志记录系统，包括：
- 统一的日志格式
- 详细的登录流程日志
- 安全相关日志
- 性能监控日志

## 🔧 日志工具类

### 位置
`/nbbb/backend/utils/logger.js`

### 功能
- 统一的日志格式：`[时间戳] [级别] [分类] 消息 | Data: {...}`
- 支持多种日志级别：info, warn, error, debug
- 专门的认证日志方法：`logger.auth()`
- 安全日志方法：`logger.security()`

## 📊 登录流程日志

### 1. 登录开始
```
[INFO] [AUTH] 开始登录流程 | Data: {"ip":"...","userAgent":"...","hasCode":true}
```

### 2. 获取微信openid
```
[INFO] [AUTH] 开始获取微信openid | Data: {"ip":"..."}
[INFO] [WECHAT] 获取openid成功 | Data: {"openid":"abc12345...","hasUnionid":true,"duration":"150ms"}
```

### 3. 用户查找/创建
```
[INFO] [AUTH] 用户已存在 | Data: {"userId":1,"openid":"abc12345...","ip":"..."}
或
[INFO] [AUTH] 创建新用户 | Data: {"userId":2,"openid":"abc12345...","ip":"..."}
```

### 4. 会话保存
```
[INFO] [AUTH] 会话保存成功 | Data: {"userId":1,"expiresAt":"2025-12-14T..."}
```

### 5. Token生成
```
[INFO] [AUTH] Token生成成功 | Data: {"userId":1,"tokenLength":200}
```

### 6. 登录成功
```
[INFO] [AUTH] 登录成功 | Data: {"userId":1,"openid":"abc12345...","isNewUser":false,"ip":"...","duration":"250ms","member":1}
```

### 7. 登录失败
```
[ERROR] [AUTH] 登录失败 | Data: {"error":"...","ip":"...","duration":"100ms"}
[ERROR] [AUTH] 微信登录异常 | Data: {"error":"...","ip":"...","duration":"100ms"}
```

## 🔍 其他接口日志

### 获取手机号
```
[INFO] [AUTH] 开始获取手机号 | Data: {"userId":1,"ip":"...","hasCode":true}
[INFO] [AUTH] 获取手机号成功 | Data: {"userId":1,"phoneNumber":"138****0000","ip":"..."}
```

### 获取用户信息
```
[INFO] [AUTH] 获取用户信息 | Data: {"userId":1,"ip":"..."}
```

### 登出
```
[INFO] [AUTH] 用户登出 | Data: {"userId":1,"ip":"..."}
```

## 📝 日志字段说明

### 通用字段
- `ip`: 客户端IP地址
- `userId`: 用户ID
- `duration`: 操作耗时（毫秒）
- `error`: 错误信息
- `stack`: 错误堆栈（仅错误时）

### 登录相关字段
- `openid`: 微信openid（脱敏显示前8位）
- `isNewUser`: 是否为新用户
- `hasCode`: 是否有code参数
- `hasUnionid`: 是否有unionid
- `member`: 会员等级

### 安全相关字段
- `userAgent`: 用户代理（限制100字符）
- `phoneNumber`: 手机号（脱敏显示）
- `tokenLength`: Token长度

## 🔒 隐私保护

所有敏感信息都已做脱敏处理：
- **openid**: 只显示前8位，如 `abc12345...`
- **手机号**: 显示格式 `138****0000`
- **Token**: 只记录长度，不记录内容

## 📖 查看日志

### 实时查看日志
```bash
journalctl -u nbbb-api -f
```

### 查看登录相关日志
```bash
journalctl -u nbbb-api --no-pager | grep -i "AUTH\|login"
```

### 查看错误日志
```bash
journalctl -u nbbb-api --no-pager | grep -i "ERROR\|error"
```

### 查看最近的日志
```bash
journalctl -u nbbb-api --no-pager -n 100
```

### 查看特定时间段的日志
```bash
journalctl -u nbbb-api --since "2025-11-14 22:00:00" --until "2025-11-14 23:00:00"
```

## 🎯 日志级别

- **INFO**: 正常操作日志（登录成功、获取信息等）
- **WARN**: 警告日志（用户不存在等）
- **ERROR**: 错误日志（登录失败、接口异常等）
- **DEBUG**: 调试日志（仅在开发环境显示）

## 📈 性能监控

所有关键操作都记录了耗时：
- 登录总耗时
- 获取openid耗时
- 获取access_token耗时
- 获取手机号耗时

## 🔍 日志示例

### 成功登录流程
```
[2025-11-14T22:50:00.000Z] [INFO] [AUTH] 开始登录流程 | Data: {"ip":"::ffff:111.55.79.232","userAgent":"Mozilla/5.0...","hasCode":true}
[2025-11-14T22:50:00.100Z] [INFO] [AUTH] 开始获取微信openid | Data: {"ip":"::ffff:111.55.79.232"}
[2025-11-14T22:50:00.250Z] [INFO] [WECHAT] 获取openid成功 | Data: {"openid":"abc12345...","hasUnionid":true,"duration":"150ms"}
[2025-11-14T22:50:00.300Z] [INFO] [AUTH] 用户已存在 | Data: {"userId":1,"openid":"abc12345...","ip":"::ffff:111.55.79.232"}
[2025-11-14T22:50:00.350Z] [INFO] [AUTH] 会话保存成功 | Data: {"userId":1,"expiresAt":"2025-12-14T22:50:00.350Z"}
[2025-11-14T22:50:00.400Z] [INFO] [AUTH] Token生成成功 | Data: {"userId":1,"tokenLength":200}
[2025-11-14T22:50:00.450Z] [INFO] [AUTH] 登录成功 | Data: {"userId":1,"openid":"abc12345...","isNewUser":false,"ip":"::ffff:111.55.79.232","duration":"450ms","member":1}
```

### 登录失败示例
```
[2025-11-14T22:50:00.000Z] [INFO] [AUTH] 开始登录流程 | Data: {"ip":"::ffff:111.55.79.232","hasCode":false}
[2025-11-14T22:50:00.010Z] [ERROR] [AUTH] 登录失败 | Data: {"reason":"缺少登录 code","ip":"::ffff:111.55.79.232"}
```

## 🚀 使用建议

1. **监控登录成功率**: 通过统计 `login_success` 和 `login_failed` 日志
2. **性能优化**: 关注 `duration` 字段，识别慢操作
3. **安全分析**: 监控异常IP和频繁失败尝试
4. **问题排查**: 使用 `userId` 和 `openid` 追踪特定用户的登录流程

---

**更新时间**: 2025-11-14  
**版本**: v1.0

