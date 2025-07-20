# 部署指南

## 快速部署到Vercel（推荐）

### 1. 准备API密钥
- 登录 [DeepSeek](https://platform.deepseek.com)
- 生成新的API密钥（替换之前暴露的密钥）

### 2. 上传到GitHub
```bash
cd /Users/apple/Desktop/Sumi
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/kurose-sumi-galgame.git
git push -u origin main
```

### 3. 部署到Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 用GitHub账号登录
3. 点击"New Project"
4. 选择你的GitHub仓库
5. 在Environment Variables中添加：
   - Key: `DEEPSEEK_API_KEY`
   - Value: `你的新API密钥`
6. 点击Deploy

### 4. 完成！
- 获得形如 `https://你的项目名.vercel.app` 的网址
- 分享给朋友即可直接访问

## 优势
- ✅ 完全免费
- ✅ 自动HTTPS
- ✅ 全球CDN加速
- ✅ API密钥安全隐藏
- ✅ 支持自定义域名