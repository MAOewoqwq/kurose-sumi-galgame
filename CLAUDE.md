# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

这是一个基于Web的Galgame引擎，专门为"黒瀨澄心理诊疗"故事设计。项目采用纯前端技术栈（HTML/CSS/JavaScript），集成了AI对话功能，支持多分支剧情和角色立绘系统。

## Development Commands

### 本地开发
```bash
# 启动本地开发服务器
npm run dev
# 或者使用Python（适用于没有Node.js的环境）
python -m http.server 3000
```

### 构建和测试
```bash
# 构建项目（仅输出消息，无实际构建步骤）
npm run build
```

### 游戏控制台命令
在浏览器控制台中可用的调试命令：
```javascript
// 剧本切换
game.loadStory("文件名.json")       // 加载自定义剧本
game.loadTemplate()                // 加载完整故事模板
game.loadKuroseSumi()             // 加载黒瀨澄心理诊疗故事

// 存档管理
game.saveGame()                   // 手动保存游戏进度
game.loadGame()                   // 加载存档

// 测试功能
game.testBackground()             // 测试背景图片功能
game.testCharacter("test.png", "right")  // 测试立绘显示
game.hideTestCharacter()          // 隐藏测试立绘
```

## Architecture

### 核心文件结构
- `game.js` - 游戏引擎核心，包含SimpleGalgameEngine类
- `index.html` - 主页面模板
- `style.css` - Y2K复古风格样式
- `api/chat.js` - Vercel API端点，处理AI对话请求

### 剧本系统
- `kurose_sumi_story.json` - 主剧本：黒瀨澄心理诊疗故事
- `nagito_special.json` - 特殊剧本：狛枝凪斗互动剧情
- `script.json` - 简单示例剧本
- `story_template.json` - 完整故事模板

### 资源文件
- `assets/characters/` - 角色立绘PNG文件
- `assets/backgrounds/` - 背景图片文件

## Character Sprite System

### 立绘定位系统
所有角色立绘统一定位在游戏窗口内：
- **位置**: 固定在left: 80px, top: 50px
- **尺寸**: 400px × 567px（固定尺寸）
- **显示**: 使用object-fit: contain保持比例
- **动画**: opacity淡入淡出效果（0.3s过渡）

立绘文件命名规范：
- `原始表情.PNG` - 中性表情
- `微笑.PNG` - 温和笑容  
- `抱着肩膀.PNG` - 害羞表情
- `担心.PNG` - 担忧表情
- `害羞担心.PNG` - 害羞+担心
- `有点生气.PNG` - 轻微愤怒
- `眯眼笑.PNG` - 开心表情

### 表情自动选择系统
游戏引擎会根据用户输入和AI回复内容自动选择合适的角色表情：
- **analyzeEmotion()** 函数分析情感关键词
- **updateCharacterEmotion()** 函数更新立绘显示
- 支持anger, worried, shy, shy_worried, happy, smile, normal等表情

## Dialogue Input and Processing

### 对话输入流程
1. **剧情模式**: 点击推进，按空格键继续
2. **选择分支**: 点击选项按钮进行选择
3. **输入姓名**: 文本输入框+确认按钮
4. **自由聊天**: 底部输入框进行AI对话

### AI对话系统
- **API集成**: DeepSeek API通过Vercel Functions
- **回退机制**: 本地回复生成（generateFallbackReply）
- **情感分析**: 根据对话内容自动选择角色表情
- API端点: `/api/chat` (POST请求)

## Special Dialogue Logic

### 特殊用户识别系统
游戏引擎包含特殊用户检测机制：

#### 弹丸论破角色识别
- **checkSpecialName()** 函数检测36个弹丸论破角色名
- 特殊处理狛枝凪斗：显示专属问候语后跳转到选择场景(id: 16)
- **getDanganronpaResponse()** 生成角色专属回复
- **setDanganronpaEmotion()** 设置对应表情

#### 狛枝凪斗特殊流程
1. 用户输入"狛枝凪斗"触发特殊识别
2. 场景6显示专属问候语："狛枝同学，是你啊。你昨天好像没有来学校，是出了什么事了吗？"
3. 设置nagitoNeedChoice标记
4. 下次点击跳转到场景16（选择：继续聊天/离开）
5. 选择"继续聊天"进入场景17，显示狛枝回复后进入自由聊天

#### 特殊剧本系统
- **loadSpecialScript()** 加载nagito_special.json
- **returnToOriginalScript()** 返回主剧本
- **handleSpecialScriptEnd()** 处理特殊剧本结束逻辑

### 剧情分支逻辑
- **场景类型**: dialog, choice, input, scene_change, narration, ending, free_chat
- **选择系统**: 支持好感度变化和场景跳转
- **变量替换**: {player_name}等变量的动态替换
- **条件跳转**: 基于游戏状态的智能跳转

## Game State Management

### 核心状态变量
```javascript
gameState: {
    progress: 1,                    // 当前进度
    choices: {},                    // 选择记录
    variables: {},                  // 游戏变量
    affection: 0,                   // 好感度
    freeChatMode: false,            // 自由聊天模式
    specialScriptMode: false,       // 特殊剧本模式
    nagitoNeedChoice: false,        // 狛枝选择标记
    nagitoGreetingShown: false,     // 狛枝问候显示标记
    isSpecialUser: false,           // 特殊用户标记
    specialUserType: null,          // 特殊用户类型
    characterName: null,            // 角色名称
    characterId: null               // 角色ID
}
```

## Script Format

### 基本场景结构
```json
{
    "id": 1,
    "type": "dialog",
    "speaker": "黒瀨澄",
    "character": "kurose",
    "sprite": "normal",
    "position": "center",
    "text": "对话内容",
    "background": "therapy_room",
    "next": 2
}
```

### 选择分支格式
```json
{
    "id": 10,
    "type": "choice", 
    "text": "选择提示文本",
    "choices": [
        {
            "text": "🍰 选项文本",
            "next": 11,
            "affection": 1
        }
    ]
}
```

## Deployment

项目部署在Vercel平台：
- **运行时**: Node.js (@vercel/node@3.2.22)
- **API Functions**: api/chat.js处理AI对话
- **环境变量**: DEEPSEEK_API_KEY（AI API密钥）
- **配置文件**: vercel.json定义函数和路由重写

## Development Notes

### 音效系统
- 使用Web Audio API生成点击音效
- createClickSound()函数创建鼠标点击声效果

### 样式特点
- Y2K复古风格设计
- 使用K2D和Kiwi Maru字体
- 渐变背景和半透明元素
- 像素化图像渲染

### 性能优化
- 立绘预加载机制（preloadImages）
- 打字机效果（typewriterText）
- 背景图片缓存和过渡动画

## Important Implementation Details

1. **立绘显示统一化**: 所有角色立绘使用相同的尺寸和位置设置，确保显示一致性
2. **特殊用户流程**: 狛枝凪斗等特殊角色有专门的对话流程和跳转逻辑
3. **AI对话集成**: 支持DeepSeek API和本地回退两种模式
4. **状态管理**: 复杂的游戏状态追踪，支持存档和加载
5. **多剧本支持**: 可以动态加载不同的JSON剧本文件

## Code Management Practices

- **Git管理**:
  - 始终用中文回答问题
  - 每一次新的改动都自动存入git

## Memories

- 现在你应该已经读取过我的文件了，现在记住我文件的逻辑和开发