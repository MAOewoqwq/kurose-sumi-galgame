# Kurose Sumi's Chat - Galgame Engine

一个基于Web的简易Galgame引擎，采用Y2K复古风格设计。

## 🎮 特性

- **纯前端实现** - 使用HTML5, CSS3, JavaScript
- **Y2K复古风格** - 像素风格UI设计
- **交互式对话** - 点击推进剧情
- **分支选择** - 支持多选项剧情分支
- **本地存档** - 自动保存游戏进度
- **响应式设计** - 适配不同屏幕尺寸

## 🚀 在线体验

访问: [https://你的用户名.github.io/Sumi](https://你的用户名.github.io/Sumi)

## 📖 操作指南

- **推进对话**: 点击对话框或按空格键
- **做出选择**: 点击选项按钮
- **保存游戏**: 浏览器控制台输入 `game.saveGame()`
- **加载存档**: 浏览器控制台输入 `game.loadGame()`

## 🛠️ 技术架构

```
├── index.html      # 主页面
├── style.css       # 样式文件
├── game.js         # 游戏引擎
├── script.json     # 剧本数据
└── assets/         # 资源文件
```

## 🎨 自定义内容

### 修改剧本
编辑 `script.json` 文件，添加你的故事内容：

```json
{
  "title": "你的故事标题",
  "scenes": [
    {
      "id": 1,
      "type": "dialog",
      "speaker": "角色名",
      "text": "对话内容"
    }
  ]
}
```

### 添加角色图片
1. 将角色立绘放入 `assets/characters/` 目录
2. 在CSS中添加对应样式
3. 在剧本中引用

## 📱 部署说明

这是一个纯静态网站，可以部署到任何静态托管服务：

- **GitHub Pages** (推荐)
- **Netlify**
- **Vercel**
- **Firebase Hosting**

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

💖 由 Claude Code 协助开发 