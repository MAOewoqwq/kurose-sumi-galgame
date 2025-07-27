// Galgame引擎 - MVP版本
class SimpleGalgameEngine {
    constructor() {
        console.log('🎮 游戏引擎启动 - 版本: v2025.07.26.smartloop - 智能循环系统');
        this.script = null;
        this.specialScript = null;  // 特殊剧本引用
        this.currentSceneId = 1;
        this.gameState = {
            progress: 1,
            choices: {},
            variables: {},
            affection: 0,
            freeChatMode: false,
            specialScriptMode: false,
            originalScript: null,
            nagitoSpecialPending: false,
            nagitoGreetingShown: false,
            nagitoNeedChoice: false,
            loopCount: 0  // 循环次数
        };
        
        // API配置
        this.apiConfig = {
            endpoint: '/api/chat', // Vercel API端点
            fallbackEnabled: true, // 启用本地回退模式
            isLocalDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        };
        
        this.messageDisplay = document.getElementById('messageDisplay');
        this.speakerName = document.getElementById('speakerName');
        this.dialogText = document.getElementById('dialogText');
        this.continueHint = document.getElementById('continueHint');
        this.chatWindow = document.querySelector('.chat-window');
        this.characterSprite = document.getElementById('characterSprite');
        this.affectionDisplay = document.getElementById('affectionValue');
        
        // 初始化点击音效
        this.clickSound = this.createClickSound();
        
        this.init();
    }
    
    createClickSound() {
        // 创建Web Audio API音效（模拟鼠标点击声）
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        return () => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // 设置音效参数（鼠标点击声 - 短促尖锐）
            oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.05);
        };
    }
    
    async init() {
        try {
            await this.loadScript();
            this.preloadImages();
            this.setupEventListeners();
            this.showCurrentScene();
        } catch (error) {
            console.error('游戏初始化失败:', error);
            this.showError('游戏加载失败，请刷新页面重试。');
        }
    }
    
    preloadImages() {
        // 预加载所有角色立绘和关键背景，减少切换时的卡顿
        if (this.script.characters) {
            Object.values(this.script.characters).forEach(character => {
                if (character.sprites) {
                    Object.values(character.sprites).forEach(spriteFile => {
                        const img = new Image();
                        img.src = `assets/characters/${spriteFile}`;
                        console.log('预加载立绘:', spriteFile);
                    });
                }
            });
        }
        
        // 预加载关键背景图片
        const keyBackgrounds = ['合照.jpg', 'IMG_3350.PNG'];
        keyBackgrounds.forEach(bg => {
            const img = new Image();
            img.src = `assets/backgrounds/${bg}`;
            img.onload = () => console.log('✅ 预加载背景成功:', bg);
            img.onerror = () => console.log('❌ 预加载背景失败:', bg);
        });
        
        // 预加载川崎立绘，确保流畅切换
        const kawasakiSprites = ['川崎抽烟.PNG', '川崎普通眼神.PNG', '川崎眯眼笑.PNG', '川崎非常害羞.PNG'];
        kawasakiSprites.forEach(sprite => {
            const img = new Image();
            img.src = `assets/characters/${sprite}`;
            img.onload = () => console.log('✅ 预加载川崎立绘成功:', sprite);
        });
    }
    
    async loadScript(scriptName = 'kurose_sumi_story.json') {
        try {
            const response = await fetch(scriptName);
            if (!response.ok) {
                throw new Error('剧本文件加载失败');
            }
            this.script = await response.json();
            console.log('剧本加载成功:', this.script.title || scriptName);
        } catch (error) {
            console.error('剧本加载错误:', error);
            throw error;
        }
    }
    
    async loadNewScript(scriptName) {
        try {
            await this.loadScript(scriptName);
            this.currentSceneId = 1;
            this.gameState = {
                progress: 1,
                choices: {}
            };
            this.showCurrentScene();
            console.log('✨ 新剧本加载完成！');
        } catch (error) {
            console.error('切换剧本失败:', error);
            this.showError('剧本切换失败，请检查文件是否存在。');
        }
    }
    
    setupEventListeners() {
        // 点击消息区域推进对话
        this.messageDisplay.addEventListener('click', () => {
            this.playClickSound();
            this.nextScene();
        });
        
        // 键盘空格键推进对话
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.playClickSound();
                this.nextScene();
            }
        });
    }
    
    playClickSound() {
        try {
            this.clickSound();
        } catch (error) {
            console.log('音效播放失败（这是正常的）:', error);
        }
    }
    
    increaseAffection(amount = 1) {
        this.gameState.affection += amount;
        this.updateAffectionDisplay();
    }
    
    updateAffectionDisplay() {
        if (this.affectionDisplay) {
            this.affectionDisplay.textContent = this.gameState.affection;
        }
    }
    
    // 计算好感度变化
    calculateAffectionChange(userMessage, aiReply, emotionScore) {
        const userLower = userMessage.toLowerCase();
        const replyLower = aiReply.toLowerCase();
        
        // 如果API返回了情感分数，优先使用
        if (emotionScore !== undefined && emotionScore !== null) {
            if (emotionScore > 0.5) return 1;
            if (emotionScore < -0.5) return -1;
            return 0;
        }
        
        // 本地情感分析
        // 正面互动 (+1好感度)
        if (userLower.includes('喜欢') || userLower.includes('爱') ||
            userLower.includes('可爱') || userLower.includes('美丽') ||
            userLower.includes('聪明') || userLower.includes('厉害') ||
            userLower.includes('感谢') || userLower.includes('谢谢') ||
            userLower.includes('帮助') || userLower.includes('关心') ||
            userLower.includes('理解') || userLower.includes('支持') ||
            userLower.includes('信任') || userLower.includes('相信')) {
            return 1;
        }
        
        // 负面互动 (-1好感度)
        if (userLower.includes('讨厌') || userLower.includes('烦') ||
            userLower.includes('笨') || userLower.includes('傻') ||
            userLower.includes('无聊') || userLower.includes('没用') ||
            userLower.includes('失望') || userLower.includes('生气') ||
            userLower.includes('恨') || userLower.includes('坏')) {
            return -1;
        }
        
        // 亲密互动 (+1好感度)
        if (userLower.includes('拥抱') || userLower.includes('抱抱') ||
            userLower.includes('牵手') || userLower.includes('亲') ||
            userLower.includes('陪伴') || userLower.includes('在一起')) {
            return 1;
        }
        
        // 默认不变
        return 0;
    }
    
    checkSpecialName(name) {
        // 弹丸论破角色数据库
        const danganronpaCharacters = {
            // 第一部主要角色
            '苗木诚': 'makoto',
            '舞园沙耶香': 'sayaka', 
            '雾切响子': 'kyoko',
            '十神白夜': 'byakuya',
            '朝日奈葵': 'aoi',
            '石丸清多夏': 'ishimaru',
            '山田一二三': 'yamada',
            '大和田纹次': 'mondo',
            '桑田怜恩': 'kuwata',
            '腐川冬子': 'toko',
            '大神樱': 'sakura',
            'セレスティア・ルーデンベルク': 'celestia',
            '塞蕾丝': 'celestia',
            '江之岛盾子': 'junko',
            '戦刃むくろ': 'mukuro',
            
            // 第二部主要角色
            '日向创': 'hajime',
            '七海千秋': 'chiaki',
            '狛枝凪斗': 'nagito',
            '田中眼蛇夢': 'gundham',
            '终里赤音': 'akane',
            '左右田和一': 'kazuichi',
            '九头龙冬彦': 'fuyuhiko',
            '花村辉辉': 'teruteru',
            '西园寺日寄子': 'hiyoko',
            '罪木蜜柑': 'mikan',
            '小泉真昼': 'mahiru',
            '澪田唯吹': 'ibuki',
            '边古山佩子': 'peko',
            '索尼娅': 'sonia',
            
            // 第三部主要角色
            '最原终一': 'shuichi',
            '赤松枫': 'kaede',
            '王马小吉': 'kokichi',
            '百田解斗': 'kaito',
            '春川魔姬': 'maki',
            '入间美兔': 'miu',
            '梦野秘密子': 'himiko',
            '茶柱转子': 'tenko',
            '白银纸女': 'tsumugi',
            '真宫寺是清': 'korekiyo',
            '星龙马': 'ryoma',
            '天海兰太郎': 'rantaro',
            '东条斩美': 'kirumi',
            '夜长安吉': 'angie',
            '獄原五月雨': 'gonta',
            '黄种身吕八十八': 'kiibo'
        };
        
        // 检查原有特殊用户
        if (name === '佳佳' || name === '唐佳锦') {
            this.gameState.isSpecialUser = true;
            this.gameState.specialUserType = 'jiajia';
            console.log('检测到特殊用户:', name);
            return;
        } else if (name === '小明') {
            this.gameState.isSpecialUser = true;
            this.gameState.specialUserType = 'xiaoming';
            console.log('检测到特殊用户:', name);
            return;
        }
        
        // 检查川崎蝾井特殊角色
        if (name === '川崎蝾井') {
            this.gameState.isSpecialUser = true;
            this.gameState.specialUserType = 'kawasaki';
            this.gameState.characterName = name;
            this.gameState.characterId = 'kawasaki';
            console.log('检测到川崎蝾井特殊角色:', name);
            return;
        }
        
        // 检查弹丸论破角色
        if (danganronpaCharacters[name]) {
            this.gameState.isSpecialUser = true;
            this.gameState.specialUserType = 'danganronpa';
            this.gameState.characterName = name;
            this.gameState.characterId = danganronpaCharacters[name];
            console.log('检测到弹丸论破角色:', name);
            return;
        }
        
        // 默认情况
        this.gameState.isSpecialUser = false;
        this.gameState.specialUserType = null;
        this.gameState.characterName = null;
        this.gameState.characterId = null;
    }
    
    async callDeepSeekAPI(userMessage) {
        // 如果是本地开发环境，尝试直接调用DeepSeek API
        if (this.apiConfig.isLocalDev) {
            console.log('💻 本地开发环境，尝试直接调用DeepSeek API');
            return await this.callDeepSeekDirectly(userMessage);
        }
        
        try {
            const response = await fetch(this.apiConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    analyzeEmotion: true  // 请求情感分析
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 根据用户输入和AI回复内容自动选择表情
            const emotion = this.analyzeEmotion(userMessage, data.reply);
            this.updateCharacterEmotion(emotion);
            
            // 处理好感度变化
            const affectionChange = this.calculateAffectionChange(userMessage, data.reply, data.emotionScore);
            if (affectionChange !== 0) {
                this.increaseAffection(affectionChange);
                this.showAffectionGain(affectionChange);
            }
            
            return data.reply;
            
        } catch (error) {
            console.error('API调用失败:', error);
            
            // 始终使用回退模式，确保用户体验
            const fallbackReply = this.generateFallbackReply(userMessage);
            const emotion = this.analyzeEmotion(userMessage, fallbackReply);
            this.updateCharacterEmotion(emotion);
            
            // 在本地模式也计算好感度
            const affectionChange = this.calculateAffectionChange(userMessage, fallbackReply);
            if (affectionChange !== 0) {
                this.increaseAffection(affectionChange);
                this.showAffectionGain(affectionChange);
            }
            
            return fallbackReply;
        }
    }
    
    // 本地回退模式：根据用户输入生成个性化回复
    generateFallbackReply(userMessage) {
        const userLower = userMessage.toLowerCase();
        
        // 问候相关 - 体现专业但温和的态度
        if (userLower.includes('你好') || userLower.includes('早上好') || 
            userLower.includes('晚上好') || userLower.includes('hi')) {
            const greetings = [
                '你好...欢迎来到心理咨询室。今天想和我聊些什么呢？',
                '嗯，你好。看起来你今天的精神状态还不错...有什么想分享的吗？',
                '...你好。请坐下吧，这里是一个安全的谈话空间。'
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        
        // 感谢相关 - 表现出轻微的害羞
        if (userLower.includes('谢谢') || userLower.includes('感谢')) {
            const thanks = [
                '...不用谢。作为心理分析师，帮助别人本来就是我的工作。',
                '能够帮到你，我也很开心...虽然有点不好意思这么说。',
                '嗯...这是我应该做的。不过听到你这么说还是会有点开心的。'
            ];
            return thanks[Math.floor(Math.random() * thanks.length)];
        }
        
        // 情感倾诉 - 专业的心理分析视角
        if (userLower.includes('难过') || userLower.includes('伤心') || 
            userLower.includes('沮丧') || userLower.includes('失落')) {
            const sadness = [
                '我从你的话语中感受到了痛苦...这种情感是完全正常的。能告诉我是什么让你感到难过吗？',
                '...看起来你现在正经历着一些困难的情绪。从心理学角度来说，承认自己的痛苦是治愈的第一步。',
                '嗯，我能理解这种沮丧的感觉。每个人都会有这样的时候...想和我分析一下原因吗？'
            ];
            return sadness[Math.floor(Math.random() * sadness.length)];
        }
        
        // 焦虑担心 - 展现专业分析能力
        if (userLower.includes('担心') || userLower.includes('害怕') || 
            userLower.includes('焦虑') || userLower.includes('紧张')) {
            const anxiety = [
                '焦虑是一种很常见的情绪反应...让我们一起分析一下你担心的具体内容，这样能帮你更好地理解自己的感受。',
                '...我注意到你提到了担心。从心理学的角度来看，适度的担心是人类的自我保护机制。你能详细说说吗？',
                '嗯，紧张的情绪确实不好受。不过我想了解的是，这种担心是基于什么具体的情况呢？'
            ];
            return anxiety[Math.floor(Math.random() * anxiety.length)];
        }
        
        // 恋爱相关 - 展现害羞但专业的一面
        if (userLower.includes('喜欢') || userLower.includes('恋爱') || 
            userLower.includes('表白') || userLower.includes('暗恋')) {
            const love = [
                '...关于感情的事情，确实需要仔细分析。虽然我在这方面经验不多，但从心理学角度可以帮你理清思路。',
                '嗯...感情问题总是很复杂呢。不过作为心理分析师，我可以帮你分析一下你的内心想法。',
                '......这种话题让我有点不好意思，但我会尽我所能帮你分析的。你能说得具体一些吗？'
            ];
            return love[Math.floor(Math.random() * love.length)];
        }
        
        // 被欺负相关 - 展现保护欲和专业判断
        if (userLower.includes('被欺负') || userLower.includes('不公平') || 
            userLower.includes('委屈') || userLower.includes('讨厌')) {
            const bullying = [
                '...这样的经历确实会让人感到愤怒和无助。没有人应该承受这样的对待。你能告诉我具体发生了什么吗？',
                '听起来你遇到了很不公平的事情。从你的描述中，我能感受到你的委屈...这种情绪反应是完全可以理解的。',
                '这种经历对任何人来说都是痛苦的。作为心理分析师，我想更深入地了解这件事对你造成的影响。'
            ];
            return bullying[Math.floor(Math.random() * bullying.length)];
        }
        
        // 询问相关 - 体现思考过程
        if (userLower.includes('什么') || userLower.includes('怎么') || 
            userLower.includes('为什么') || userLower.includes('?') || userLower.includes('？')) {
            const questions = [
                '...这是个很有意思的问题。让我想想该怎么从心理学的角度来解释。',
                '嗯，你问的这个问题需要我仔细思考一下...每个人的情况都不太一样呢。',
                '从心理分析的角度来看...这确实是一个值得深入探讨的问题。'
            ];
            return questions[Math.floor(Math.random() * questions.length)];
        }
        
        // 积极情绪
        if (userLower.includes('开心') || userLower.includes('高兴') || 
            userLower.includes('快乐') || userLower.includes('兴奋')) {
            const happiness = [
                '看到你这么开心，我也跟着高兴起来了...能分享一下是什么让你这么快乐吗？',
                '...你的快乐情绪很有感染力呢。从心理学角度来说，积极情绪对身心健康都很有益。',
                '嗯，你现在的状态看起来很不错。这种正面的情绪很珍贵，值得好好珍惜。'
            ];
            return happiness[Math.floor(Math.random() * happiness.length)];
        }
        
        // 默认回复 - 更有个性和深度
        const defaultReplies = [
            '...我在仔细听你说话。从你的表达中，我能感受到一些复杂的情绪。能再详细说说吗？',
            '嗯，从心理学的角度来分析，每个人的想法都有其独特的原因...你愿意和我分享更多吗？',
            '我正在思考你刚才说的话...作为心理分析师，我想更深入地了解你的内心想法。',
            '...你的话让我想到了一些心理学理论。不过我更想听听你自己是怎么看待这件事的。',
            '从你的语言中，我观察到了一些有意思的细节...这可能反映了你内心的某些想法。'
        ];
        
        return defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
    }
    
    // 加载特殊剧本
    async loadSpecialScript(scriptName, silent = false, startSceneId = 1) {
        try {
            // 保存当前剧本
            if (!this.gameState.originalScript) {
                this.gameState.originalScript = {
                    script: this.script,
                    sceneId: this.currentSceneId,
                    gameState: { ...this.gameState }
                };
            }
            
            const response = await fetch(scriptName);
            if (!response.ok) {
                throw new Error(`无法加载剧本: ${response.status}`);
            }
            
            const newScript = await response.json();
            this.script = newScript;
            this.specialScript = newScript;  // 保存特殊剧本引用
            this.currentSceneId = startSceneId;
            this.gameState.specialScriptMode = true;
            
            // 清理其他狛枝状态，但保留nagitoNeedChoice用于主剧本跳转
            this.gameState.nagitoGreetingShown = false;
            this.gameState.nagitoSpecialPending = false;
            // 注意：不清除nagitoNeedChoice，因为狛枝使用主剧本流程
            
            // 初始化变量
            if (newScript.variables) {
                Object.assign(this.gameState.variables, newScript.variables);
            }
            
            if (!silent) {
                console.log('特殊剧本加载成功:', scriptName);
            }
            return true;
            
        } catch (error) {
            console.error('加载特殊剧本失败:', error);
            return false;
        }
    }
    
    // 加载狛枝凪斗特殊剧本
    async loadNagitoSpecialScript() {
        try {
            console.log('🎯 开始加载狛枝凪斗特殊剧本');
            // 直接从场景2开始，跳过重复的开场白
            const success = await this.loadSpecialScript('nagito_special.json', false, 2);
            if (success) {
                console.log('✅ 狛枝凪斗特殊剧本加载成功，从选择场景开始');
                this.showCurrentScene();
            } else {
                console.error('❌ 狛枝凪斗特殊剧本加载失败，回退到自由聊天');
                this.enableFreeChat();
            }
        } catch (error) {
            console.error('❌ 加载狛枝特殊剧本时出错:', error);
            this.enableFreeChat();
        }
    }

    // 加载川崎蝾井特殊剧本
    async loadKawasakiSpecialScript() {
        try {
            console.log('🎯 开始加载川崎蝾井特殊剧本');
            
            // 先清理当前立绘状态，确保流畅切换
            this.prepareForKawasakiScript();
            
            // 优化延迟，提升加载速度
            setTimeout(async () => {
                // 从场景1开始，展示完整的双角色对话
                const success = await this.loadSpecialScript('kawasaki_special.json', false, 1);
                if (success) {
                    console.log('✅ 川崎蝾井特殊剧本高速加载成功，开始双角色对话');
                    this.showCurrentScene();
                } else {
                    console.error('❌ 川崎蝾井特殊剧本加载失败，回退到自由聊天');
                    this.enableFreeChat();
                }
            }, 120); // 缩短至120ms提升响应速度
            
        } catch (error) {
            console.error('❌ 加载川崎蝾井特殊剧本时出错:', error);
            this.enableFreeChat();
        }
    }

    // 为川崎蝾井剧本准备立绘状态 - 优化流畅度
    prepareForKawasakiScript() {
        const sprite = this.characterSprite;
        if (sprite && sprite.style.display !== 'none') {
            // 快速渐隐当前立绘
            sprite.classList.remove('show');
            sprite.classList.add('fade-out');
            
            // 缩短延迟，快速清理样式
            setTimeout(() => {
                sprite.classList.remove('fade-out', 'left', 'center', 'right');
                // 完全清理样式，为统一定位做准备
                sprite.removeAttribute('style');
                sprite.style.display = 'none';
                console.log('🎭 立绘状态快速准备完成');
            }, 80); // 缩短为80ms提升响应速度
        }
        
        // 重置川崎蝾井相关状态
        this.gameState.kawasakiNeedSpecialScript = false;
        console.log('🔄 川崎蝾井剧本高速准备完成');
    }
    
    // 返回原始剧本
    returnToOriginalScript() {
        if (this.gameState.originalScript) {
            this.script = this.gameState.originalScript.script;
            this.specialScript = null;  // 清理特殊剧本引用
            
            // 关键修改：强制回到场景1（初始界面）
            this.currentSceneId = 1;
            
            this.gameState.specialScriptMode = false;
            
            // 清理川崎蝾井特殊状态
            this.clearKawasakiSpecialStates();
            
            // 清理立绘显示，准备返回标准模式
            this.cleanupCharacterDisplay();
            
            // 恢复初始背景
            console.log('🔄 从特殊剧本返回，恢复初始背景');
            // 先移除特殊背景样式
            const hideStyle = document.getElementById('force-hide-bg');
            if (hideStyle) {
                hideStyle.remove();
            }
            this.chatWindow.classList.remove('show-hezhao');
            this.updateBackground('therapy_room'); // 这会触发背景恢复逻辑
            
            // 完全重置游戏状态到初始状态，但保留特殊用户信息
            const savedSpecialUser = {
                isSpecialUser: this.gameState.isSpecialUser,
                specialUserType: this.gameState.specialUserType,
                characterName: this.gameState.characterName,
                characterId: this.gameState.characterId
            };
            
            // 重置到初始状态
            this.gameState = {
                progress: 1,
                choices: {},
                variables: {},
                affection: 0,
                freeChatMode: false,
                specialScriptMode: false,
                nagitoNeedChoice: false,
                nagitoGreetingShown: false,
                nagitoNeedSpecialScript: false,
                kawasakiNeedSpecialScript: false,
                // 保留特殊用户状态以支持重复进入川崎剧情
                isSpecialUser: savedSpecialUser.isSpecialUser,
                specialUserType: savedSpecialUser.specialUserType,
                characterName: savedSpecialUser.characterName,
                characterId: savedSpecialUser.characterId,
                originalScript: null,
                originalBackgroundSaved: false,  // 清除背景保存状态
                loopCount: 0
            };
            
            console.log('✅ 已返回初始界面，可重复进入川崎剧情');
            return true;
        }
        return false;
    }

    // 清理川崎蝾井特殊状态
    clearKawasakiSpecialStates() {
        this.gameState.kawasakiNeedSpecialScript = false;
        console.log('🧹 川崎蝾井特殊状态已清理');
    }

    // 优化立绘显示状态清理
    cleanupCharacterDisplay() {
        const sprite = this.characterSprite;
        if (sprite) {
            // 快速渐隐当前立绘
            sprite.classList.remove('show');
            sprite.classList.add('fade-out');
            
            // 优化清理时间，与新的过渡时间匹配
            setTimeout(() => {
                sprite.style.display = 'none';
                // 不再清空src，保留路径信息
                // sprite.src = '';
                sprite.classList.remove('fade-out', 'left', 'center', 'right');
                // 清理所有强制样式，回到CSS控制
                sprite.removeAttribute('style');
                console.log('🎭 立绘显示状态快速清理完成');
            }, 200); // 优化为200ms，匹配新的fade-out时间
        }
    }
    
    // 处理转换到自由聊天模式
    handleFreeChatTransition() {
        // 如果在特殊剧本模式，返回原始剧本
        if (this.gameState.specialScriptMode) {
            this.returnToOriginalScript();
        }
        
        // 启用自由聊天
        setTimeout(() => {
            this.enableFreeChat();
        }, 500);
    }
    
    // 处理特殊剧本结束
    handleSpecialScriptEnd() {
        if (this.gameState.specialScriptMode) {
            // 显示过渡提示
            this.continueHint.textContent = '🔄 返回中...';
            
            // 返回原始剧本
            if (this.returnToOriginalScript()) {
                // 延迟启用自由聊天
                setTimeout(() => {
                    this.enableFreeChat();
                }, 800);
            } else {
                // 如果返回失败，直接启用自由聊天
                this.enableFreeChat();
            }
        } else {
            // 如果不在特殊剧本模式，直接启用自由聊天
            this.enableFreeChat();
        }
    }
    
    // 分析用户输入和AI回复的情感内容
    analyzeEmotion(userMessage, aiReply) {
        const userLower = userMessage.toLowerCase();
        const replyLower = aiReply.toLowerCase();
        
        // 生气/不满相关关键词
        if (userLower.includes('被欺负') || userLower.includes('不公平') || 
            userLower.includes('讨厌') || userLower.includes('烦') ||
            userLower.includes('生气') || userLower.includes('愤怒') ||
            replyLower.includes('不应该') || replyLower.includes('不对')) {
            return 'angry';
        }
        
        // 担心/忧虑相关关键词
        if (userLower.includes('担心') || userLower.includes('害怕') ||
            userLower.includes('焦虑') || userLower.includes('紧张') ||
            userLower.includes('不安') || userLower.includes('困扰') ||
            replyLower.includes('理解你的担心') || replyLower.includes('不用担心')) {
            return 'worried';
        }
        
        // 害羞相关 - 增加更多触发条件
        if (userLower.includes('喜欢') || userLower.includes('恋爱') ||
            userLower.includes('表白') || userLower.includes('心动') ||
            userLower.includes('暗恋') || userLower.includes('约会') ||
            userLower.includes('可爱') || userLower.includes('美') ||
            userLower.includes('漂亮') || userLower.includes('夸') ||
            userLower.includes('温柔') || userLower.includes('喜欢你') ||
            replyLower.includes('感情') || replyLower.includes('心意') ||
            replyLower.includes('不好意思') || replyLower.includes('害羞')) {
            // 如果是被夸奖或者恋爱话题，更倾向于害羞
            if (userLower.includes('夸') || userLower.includes('可爱') || 
                userLower.includes('漂亮') || userLower.includes('喜欢你')) {
                return 'shy';
            }
            // 如果涉及担心或者不确定的感情，使用害羞担心
            if (userLower.includes('怎么办') || userLower.includes('不知道') ||
                replyLower.includes('担心') || replyLower.includes('不确定')) {
                return 'shy_worried';
            }
            return Math.random() > 0.6 ? 'shy' : 'shy_worried';
        }
        
        // 开心/眯眼笑相关 - 更多愉快场景
        if (userLower.includes('开心') || userLower.includes('高兴') ||
            userLower.includes('快乐') || userLower.includes('兴奋') ||
            userLower.includes('成功') || userLower.includes('太好了') ||
            userLower.includes('哈哈') || userLower.includes('有趣') ||
            userLower.includes('好玩') || userLower.includes('恭喜') ||
            userLower.includes('太棒了') || userLower.includes('真好') ||
            replyLower.includes('很好') || replyLower.includes('棒') ||
            replyLower.includes('开心') || replyLower.includes('高兴') ||
            replyLower.includes('恭喜')) {
            // 特别开心的情况用眯眼笑
            if (userLower.includes('太好了') || userLower.includes('太棒了') ||
                userLower.includes('哈哈') || replyLower.includes('恭喜')) {
                return 'happy';
            }
            return Math.random() > 0.5 ? 'happy' : 'smile';
        }
        
        // 感谢相关 - 可能害羞也可能微笑
        if (userLower.includes('谢谢') || userLower.includes('感谢')) {
            // 如果是特别真诚的感谢，可能会害羞
            if (userLower.includes('真的谢谢') || userLower.includes('非常感谢') ||
                userLower.includes('太感谢了')) {
                return Math.random() > 0.7 ? 'shy' : 'smile';
            }
            return 'smile';
        }
        
        // 微笑/温和相关内容
        if (replyLower.includes('不错') || replyLower.includes('可以') ||
            replyLower.includes('理解') || replyLower.includes('支持') ||
            userLower.includes('你好')) {
            return 'smile';
        }
        
        // 默认表情
        return 'normal';
    }
    
    // 更新角色表情
    updateCharacterEmotion(emotion) {
        if (this.script.characters.kurose.sprites[emotion]) {
            const spriteFile = this.script.characters.kurose.sprites[emotion];
            this.showCharacter(spriteFile, 'center', emotion);
        }
    }

    updateKawasakiEmotion(emotion) {
        // 川崎蝾井专用情感更新函数
        const kawasakiEmotions = {
            'normal': '川崎普通眼神.PNG',
            'smoking': '川崎抽烟.PNG', 
            'smile': '川崎眯眼笑.PNG',
            'shy': '川崎非常害羞.PNG'
        };
        
        if (kawasakiEmotions[emotion]) {
            this.showCharacterWithFixedPosition(kawasakiEmotions[emotion], emotion);
            console.log('川崎蝾井表情更新:', emotion, '->', kawasakiEmotions[emotion]);
        }
    }

    showCharacterWithFixedPosition(spriteFile, emotion) {
        // 川崎特殊剧情专用显示函数，所有角色严格固定位置
        const sprite = this.characterSprite;
        const newSrc = `assets/characters/${spriteFile}`;
        
        // 检查是否需要切换图片
        const needsChange = sprite.style.display === 'none' || 
                           !sprite.src.includes(spriteFile);
        
        if (!needsChange) return;
        
        // 优化的流畅淡出淡入效果
        if (sprite.style.display !== 'none' && sprite.classList.contains('show')) {
            sprite.classList.remove('show');
            sprite.classList.add('fade-out');
            
            setTimeout(() => {
                this.loadFixedPositionSprite(spriteFile, emotion);
            }, 100); // 缩短过渡时间提升流畅度
        } else {
            // 直接加载，适用于首次显示或已隐藏状态
            this.loadFixedPositionSprite(spriteFile, emotion);
        }
        
        console.log('🎭 川崎剧情立绘流畅切换:', spriteFile, '表情:', emotion);
    }

    // 川崎特殊剧情专用立绘加载函数，适用于所有角色
    loadFixedPositionSprite(spriteFile, emotion) {
        // 严格遵循统一位置规格的立绘加载
        const sprite = this.characterSprite;
        
        // 确保sprite存在
        if (!sprite) {
            console.error('❌ 立绘元素不存在');
            return;
        }
        
        // 设置图片源 - 直接使用原始路径
        const imagePath = `assets/characters/${spriteFile}`;
        console.log('🖼️ 加载立绘:', spriteFile, '路径:', imagePath);
        
        // 在设置src之前保存路径，用于错误报告
        sprite.setAttribute('data-intended-src', imagePath);
        
        // 强制确保src被正确设置
        sprite.src = imagePath;
        // 立即再次验证src是否被设置
        if (!sprite.src || sprite.src === '' || sprite.src === window.location.href) {
            console.warn('⚠️ src设置失败，强制重试');
            sprite.setAttribute('src', imagePath);
        }
        
        sprite.style.display = 'block';
        
        // 严格的统一位置设置 - 完全符合统一规格
        const fixedStyles = {
            position: 'absolute !important',
            width: '400px !important',
            height: '567px !important', 
            left: '80px !important',
            top: '50px !important',
            right: 'auto !important',
            bottom: 'auto !important',
            objectFit: 'contain !important',
            objectPosition: 'center center !important',
            transform: 'none !important',
            maxWidth: '400px !important',
            maxHeight: '567px !important',
            minWidth: '400px !important',
            minHeight: '567px !important',
            margin: '0 !important',
            padding: '0 !important',
            boxSizing: 'border-box !important',
            opacity: '1 !important',
            transition: 'opacity 0.2s ease !important',
            filter: 'brightness(1) contrast(1.1) saturate(1.1)',
            imageRendering: '-webkit-optimize-contrast',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden'
        };
        
        // 强制应用样式
        Object.assign(sprite.style, fixedStyles);
        
        // 移除所有位置类，添加固定类
        sprite.classList.remove('left', 'center', 'right', 'show', 'fade-out');
        sprite.classList.add('center');
        
        // 高流畅度显示动画
        const showSprite = () => {
            // 强制应用统一位置样式 - 确保川崎和黒瀨澄完全一致
            Object.assign(sprite.style, fixedStyles);
            
            // 使用双重优化确保流畅显示
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    sprite.classList.add('show');
                    console.log('✨ 川崎剧情立绘高流畅显示:', spriteFile);
                });
            });
        };
        
        if (sprite.complete && sprite.naturalHeight !== 0) {
            showSprite();
        } else {
            sprite.onload = showSprite;
            sprite.onerror = () => {
                console.error('川崎剧情立绘加载失败:', spriteFile);
                console.error('完整路径:', sprite.getAttribute('data-intended-src'));
                console.error('实际src:', sprite.src);
                console.error('当前specialScript:', this.specialScript);
                console.error('当前script:', this.script);
                console.error('图片元素:', sprite);
                
                // 检查文件是否实际存在
                const testImg = new Image();
                testImg.onload = () => console.log('✅ 图片文件存在:', imagePath);
                testImg.onerror = () => console.error('❌ 图片文件不存在:', imagePath);
                testImg.src = imagePath;
            };
        }
    }

    loadKawasakiSprite(spriteFile, emotion) {
        // 保留原有函数以兼容
        this.loadFixedPositionSprite(spriteFile, emotion);
    }
    
    getSpecialResponse(originalText, scene) {
        // 如果是特殊用户且是第一次问候回答
        if (this.gameState.isSpecialUser && 
            scene.id === 6 && 
            (originalText.includes('啊，你好') || originalText.includes('{player_name}'))) {
            
            if (this.gameState.specialUserType === 'jiajia') {
                return '你终于来了。我等你很久了。你画的画非常好看，也是你造就了一部分的我。';
            } else if (this.gameState.specialUserType === 'xiaoming') {
                return '啊...是你。小明，你是个非常善良又阳光的孩子。请你无论何时都要相信自己。';
            } else if (this.gameState.specialUserType === 'kawasaki') {
                // 川崎蝾井的特殊处理：设置特殊剧本加载标记
                console.log('🎯 川崎蝾井：设置特殊剧本加载标记');
                // 不显示立绘，让剧本自己控制
                // 设置标记：下次点击将加载特殊剧本
                this.gameState.kawasakiNeedSpecialScript = true;
                return '...';
            } else if (this.gameState.specialUserType === 'danganronpa') {
                // 狛枝凪斗的特殊处理：显示符合原作的问候语，后续将加载特殊剧本
                if (this.gameState.characterId === 'nagito') {
                    console.log('🎯 狛枝凪斗：显示专属问候语，设置特殊剧本加载标记');
                    console.log('📝 当前狛枝对话版本: v2025.07.26');
                    this.setDanganronpaEmotion(this.gameState.characterId);
                    // 设置标记：下次点击将加载特殊剧本
                    this.gameState.nagitoNeedSpecialScript = true;
                    // 返回符合原作的问候语
                    const response = this.getDanganronpaResponse(this.gameState.characterName, this.gameState.characterId);
                    console.log('🗣️ 狛枝对话内容:', response);
                    return response;
                } else {
                    // 其他弹丸论破角色的正常处理
                    this.setDanganronpaEmotion(this.gameState.characterId);
                    return this.getDanganronpaResponse(this.gameState.characterName, this.gameState.characterId);
                }
            }
        }
        return originalText;
    }
    
    // 弹丸论破角色专属回答
    getDanganronpaResponse(characterName, characterId) {
        const responses = {
            // 第一部角色
            'makoto': `${characterName}...苗木同学？没想到会在这里遇到你。你总是那么乐观向上，有你在的地方总是充满希望呢。作为心理分析师，我很钦佩你的坚强意志。`,
            
            'sayaka': `${characterName}...舞园同学。你的歌声真的很治愈人心。从心理学角度来说，音乐确实有着强大的治疗效果。...不过，我想每个人内心都有脆弱的一面吧。`,
            
            'kyoko': `${characterName}...雾切同学，久仰大名。作为同样从事推理分析工作的人，我对你的能力深感钦佩。不过，你给人的感觉总是那么冷静...有时候，适当表达情感也是很重要的。`,
            
            'byakuya': `${characterName}...十神同学。你的优越感很明显，但这可能是一种心理防护机制。...虽然你总是高高在上的样子，但我觉得真正的你应该比表面看起来更复杂吧。`,
            
            'toko': `${characterName}...腐川同学？...我能感受到你内心深处的不安和恐惧。作为心理分析师，我很想帮助你解决那些心理创伤。每个人都值得被温柔对待。`,
            
            'junko': `${characterName}...江之岛同学。...你的存在让我感到很复杂的情绪。从心理学角度来分析，你对绝望的执着可能源于更深层的心理需求。不过...我还是希望你能找到真正的内心平静。`,
            
            // 第二部角色
            'hajime': `${characterName}...日向同学。你给我的感觉很真诚，虽然有时候会迷茫，但这种真实的困惑反而显得很珍贵。...在寻找自我的路上，有困惑是很正常的事情。`,
            
            'chiaki': `${characterName}...七海同学！虽然我对游戏不太了解，但我知道你是个非常温柔的人。你总是能在关键时刻给大家指引方向...这种品质很了不起呢。`,
            
            'nagito': `狛枝同学，是你啊。你昨天好像没有来学校，是出了什么事了吗？`,
            
            'mikan': `${characterName}...罪木同学。...我能感受到你内心的痛苦和不安。那种想要被需要的心情，我能理解。作为医疗工作者的同行，我想对你说...你本身就很有价值，不需要贬低自己。`,
            
            // 第三部角色
            'shuichi': `${characterName}...最原同学。同样是从事推理工作的人呢。我能感受到你内心的善良和正义感，但有时候也会因为真相而痛苦吧？...有些时候，接受自己的软弱也是一种勇气。`,
            
            'kaede': `${characterName}...赤松同学。你的钢琴演奏一定很动人吧。从你的气质来看，你是个很有领导力的人...但是，记得不要把所有压力都承担在自己身上哦。`,
            
            'kokichi': `${characterName}...王马同学...说实话，要分析你的心理真的很困难呢。你把真心隐藏得太深了。不过我想，在那些谎言背后，一定有你想要保护的东西吧？`,
            
            'maki': `${characterName}...春川同学。虽然你看起来很冷淡，但我能感受到你内心的温柔。杀手的身份一定给你带来了很多心理负担...如果愿意的话，我很乐意倾听你的烦恼。`,
            
            // 第一部缺失角色
            'aoi': `${characterName}...朝日奈同学！你的游泳能力真的很了不起呢。从你身上，我能感受到那种纯真和正能量...这种阳光的性格真的很珍贵。`,
            
            'ishimaru': `${characterName}...石丸同学。你对规则的坚持和正义感让我很敬佩。不过，有时候过于严格也会给自己带来压力...记得偶尔也要放松一下哦。`,
            
            'yamada': `${characterName}...山田同学。虽然我对二次元文化不太了解，但我能感受到你对自己爱好的热情。有专属于自己的世界是件很美好的事情呢。`,
            
            'mondo': `${characterName}...大和田同学。你的性格很直率，但我能感受到你内心的义气和责任感。...不过，有时候过于压抑情绪也不是好事。`,
            
            'kuwata': `${characterName}...桑田同学。你的棒球能力和音乐才能都很出色呢。从心理学角度来说，多才多艺的人往往内心都很丰富...但也可能会有些迷茧吧？`,
            
            'sakura': `${characterName}...大神同学。你的实力和内心的强大都让我很敬佩。作为格斗家，你一定经历了很多艰苦的训练...但你依然保持着温柔的心。`,
            
            'celestia': `${characterName}...塞蕾丝同学。你的优雅和神秘感很吸引人呢。不过，我能感受到你把真实的自己隐藏得很深...有时候，做真实的自己也很重要哦。`,
            
            'mukuro': `${characterName}...战刃同学。你给人的感觉很复杂呢。作为军人，你一定经历了很多常人难以理解的事情...如果你愿意的话，我想倾听你的故事。`,
            
            // 第二部缺失角色
            'gundham': `${characterName}...田中同学。你的中二台词和对动物的爱都让我很惄动。在那些华丽的词藻背后，我能感受到你的纯真和善良...你真的很温柔呢。`,
            
            'akane': `${characterName}...终里同学！你的活力和对食物的热情都很可爱呢。你那种直接的性格和对生活的积极态度...真的很令人羡慕。`,
            
            'kazuichi': `${characterName}...左右田同学。你的机械才能真的很了不起！不过，我能感受到你在人际关系上有些不自信...其实你已经很优秀了，要更加相信自己哦。`,
            
            'fuyuhiko': `${characterName}...九头龙同学。虽然你的话语很粗犒，但我能感受到你对伙伴的真心在意。作为黑道的继承人，你肩负着很大的压力吧...但你的内心其实很温柔。`,
            
            'teruteru': `${characterName}...花村同学。你的料理才能真的很棒！能够用美食带给人们幸福...这种才能很珍贵。不过，有时候也要注意一下对他人的态度哦。`,
            
            'hiyoko': `${characterName}...西园寺同学。你的舞蹈很美，就像传统艺术一样优雅。不过，我能感受到你用尖刻的话语来保护自己...其实你的内心很细腻吧？`,
            
            'mahiru': `${characterName}...小泉同学。你的摄影作品一定很能捕捉人们真实的一面吧。你那种照顾他人的性格和责任感...真的很令人敬佩。`,
            
            'ibuki': `${characterName}...澳田同学！你的音乐和活力都很感染人呢！虽然我不太了解摇滚音乐，但我能感受到你对音乐的纯真热爱...这种正能量很珍贵。`,
            
            'peko': `${characterName}...边古山同学。你的剑术和忠诚都让我很敬佩。但作为一个独立的个体，你也有自己的价值...不要只把自己当做工具哦。`,
            
            'sonia': `${characterName}...索尼娅同学。作为王室成员，你的优雅和智慧都很出众。不过，我能感受到你对普通生活的向往...有时候，做普通人也是一种幸福呢。`,
            
            // 第三部缺失角色
            'kaito': `${characterName}...百田同学！你的太空梦想和领导力都很了不起。你总是能在关键时刻鼓励大家...这种正能量和乐观精神真的很珍贵。`,
            
            'miu': `${characterName}...入间同学。你的发明才能真的很惊人！不过，我能感受到你用粗鲁的话语来掩饰内心的不安...其实你对自己的能力很没信心吧？`,
            
            'himiko': `${characterName}...梦野同学。你的魔术表演一定很精彩吧。虽然你总是一副懒洋洋的样子，但我能感受到你对魔术的认真和热情...这种坚持很了不起。`,
            
            'tenko': `${characterName}...茶柱同学。你的合气道很厉害呢！你对女性的保护欲和正义感都很强烈...不过，有时候也要给男性一些机会哦。`,
            
            'tsumugi': `${characterName}...白银同学。你的cosplay技巧和对作品的理解都很深入呢。不过，我能感受到你在现实中有些缺乏存在感...真实的你其实很有魅力。`,
            
            'korekiyo': `${characterName}...真宫寺同学。你的人类学知识和哲学思考都很深刻。不过，我能感受到你对人性的复杂情感...有时候，过度理性也不是好事。`,
            
            'ryoma': `${characterName}...星同学。你的网球技巧一定很了不起。不过，我能感受到你对生活已经失去了希望...但是，每个人都有重新开始的机会。`,
            
            'rantaro': `${characterName}...天海同学。你给人的感觉很神秘呢。你的成熟和冷静都让人印象深刻...但我能感受到你内心有些不安。你在寻找什么吗？`,
            
            'kirumi': `${characterName}...东条同学。你的管家技能和对他人的关心都很了不起。但是，有时候也要关心一下自己...你的需求和感受也很重要。`,
            
            'angie': `${characterName}...夜长同学。你的艺术才能和对信仰的虚诚都很纯真。不过，有时候也要倾听一下其他人的意见...每个人都有自己的价值和想法。`,
            
            'gonta': `${characterName}...獄原同学。你对昨虫的知识和对自然的热爱都很了不起！你的绍士风度和善良心地...这种纯真在现代很难得呢。`
        };
        
        return responses[characterId] || `${characterName}...没想到会在这里遇到你。能和希望峰学园的同学交流，我感到很荣幸。...虽然我们可能不太熟悉，但作为心理分析师，我愿意倾听你的任何烦恼。`;
    }
    
    // 为弹丸论破角色设置对应表情
    setDanganronpaEmotion(characterId) {
        const emotionMap = {
            // 开心/眯眼笑的角色
            'makoto': 'smile',    // 苗木 - 乐观的主角
            'chiaki': 'happy',    // 七海 - 温柔可爱
            'kaede': 'smile',     // 赤松 - 积极向上
            
            // 害羞的角色
            'sayaka': 'shy',      // 舞园 - 偶像，可能让澄害羞
            'mikan': 'shy_worried', // 罪木 - 同为医疗相关，但担心她的状态
            
            // 担心的角色  
            'nagito': 'worried',  // 狛枝 - 担心他的心理状态
            'junko': 'worried',   // 江之岛 - 对绝望的担心
            'toko': 'shy_worried', // 腐川 - 担心她的创伤
            'mikan': 'shy_worried', // 罪木 - 同为医疗相关，但担心她的状态
            'byakuya': 'normal',  // 十神 - 保持冷静分析
            'kyoko': 'normal',    // 雾切 - 专业对专业
            'shuichi': 'normal',  // 最原 - 同为推理工作者
            'kokichi': 'worried', // 王马 - 担心他的谎言背后
            'maki': 'normal',     // 春川 - 专业的同理心
            
            // 其他角色默认表情
            'aoi': 'smile',       // 朝日奈 - 阳光正能量
            'ishimaru': 'normal', // 石丸 - 严肃认真
            'yamada': 'shy',      // 山田 - 对二次元文化的理解
            'mondo': 'normal',    // 大和田 - 直率性格
            'kuwata': 'normal',   // 桑田 - 复杂的才能
            'sakura': 'smile',    // 大神 - 敬佩她的实力
            'celestia': 'normal', // 塞蕾丝 - 神秘优雅
            'mukuro': 'worried',  // 战刃 - 复杂的背景
            'hajime': 'normal',   // 日向 - 真诚迷茧
            'gundham': 'smile',   // 田中 - 喜欢他的纯真
            'akane': 'smile',     // 终里 - 活力正能量
            'kazuichi': 'normal', // 左右田 - 理解他的不自信
            'fuyuhiko': 'normal', // 九头龙 - 看穿他的温柔
            'teruteru': 'normal', // 花村 - 欣赏料理才能
            'hiyoko': 'worried',  // 西园寺 - 担心她的防御机制
            'mahiru': 'smile',    // 小泉 - 敬佩她的责任感
            'ibuki': 'happy',     // 澳田 - 被她的活力感染
            'peko': 'normal',     // 边古山 - 严肃的剑士
            'sonia': 'smile',     // 索尼娅 - 王室优雅
            'kaito': 'smile',     // 百田 - 正能量感染
            'kaede': 'smile',     // 赤松 - 积极向上
            'miu': 'normal',      // 入间 - 理解她的不安
            'himiko': 'normal',   // 梦野 - 对魔术的认真
            'tenko': 'normal',    // 茶柱 - 理性分析
            'tsumugi': 'worried', // 白银 - 担心她的存在感
            'korekiyo': 'normal', // 真宫寺 - 哲学思考
            'ryoma': 'worried',   // 星 - 担心他的绝望
            'rantaro': 'normal',  // 天海 - 神秘不安
            'kirumi': 'normal',   // 东条 - 专业的管家
            'angie': 'smile',     // 夜长 - 纯真的信仰
            'gonta': 'smile',     // 獄原 - 纯真善良
            'junko': 'worried',   // 江之岛 - 复杂情绪
            'toko': 'worried',    // 腐川 - 担心她的创伤
            
            // 严肃/思考的角色
            'kyoko': 'normal',    // 雾切 - 同行，保持专业
            'shuichi': 'normal',  // 最原 - 同行
            'byakuya': 'normal',  // 十神 - 分析他的心理
            
            // 微笑/温和的角色
            'hajime': 'smile',    // 日向 - 真诚的人
            'kokichi': 'smile',   // 王马 - 有趣但复杂
            'maki': 'smile'       // 春川 - 理解她的温柔
        };
        
        const emotion = emotionMap[characterId] || 'normal';
        this.updateCharacterEmotion(emotion);
    }
    
    // 隐藏角色立绘
    hideCharacter() {
        const sprite = this.characterSprite;
        if (sprite) {
            sprite.style.display = 'none';
        }
    }
    
    // 显示狛枝凪斗的特殊选择（备用方案）
    showNagitoChoices() {
        // 使用游戏现有的选择系统，样式与吃蛋糕、游乐园选择一致
        const choices = [
            {
                text: "💬 和他继续聊天",
                action: 'continue'
            },
            {
                text: "🚪 离开",
                action: 'leave'
            }
        ];
        
        // 使用现有的showChoices函数显示选择
        this.showChoices(choices.map(choice => ({
            ...choice,
            next: null
        })));
        
        // 重写选择处理逻辑
        const choiceButtons = document.querySelectorAll('.choice-button');
        choiceButtons.forEach((button, index) => {
            button.removeEventListener('click', this.selectChoice);
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleNagitoChoice(choices[index].action);
            });
        });
    }
    
    // 处理狛枝凪斗的选择（备用方案）
    handleNagitoChoice(choice) {
        this.hideChoices();
        this.playClickSound();
        
        if (choice === 'continue') {
            this.speakerName.textContent = '黒瀨澄';
            this.updateCharacterEmotion('smile');
            this.typewriterText('其实，我觉得你根本不像看起来的那样疯狂呢。');
            
            setTimeout(() => {
                this.speakerName.textContent = '狛枝凪斗';
                this.hideCharacter();
                this.typewriterText('诶？我吗？');
                this.increaseAffection(1);
                this.showAffectionGain(1);
                
                setTimeout(() => {
                    this.speakerName.textContent = '黒瀨澄';
                    this.showCharacter('原始表情.PNG', 'center', 'normal');
                    this.enableFreeChat();
                }, 4000);
            }, 3000);
        } else {
            this.speakerName.textContent = '黒瀨澄';
            this.updateCharacterEmotion('normal');
            this.typewriterText('...还是算了吧。也许现在还不是深入交流的时候。');
            setTimeout(() => this.enableFreeChat(), 4000);
        }
    }
    
    // 显示好感度获得提示
    showAffectionGain(amount) {
        const gainIndicator = document.createElement('div');
        gainIndicator.textContent = `好感度 +${amount}`;
        gainIndicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 105, 180, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 16px;
            font-weight: bold;
            z-index: 1000;
            pointer-events: none;
            animation: affectionGain 2s ease-out forwards;
        `;
        
        if (!document.querySelector('#affection-animation-style')) {
            const style = document.createElement('style');
            style.id = 'affection-animation-style';
            style.textContent = `
                @keyframes affectionGain {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -60%) scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(gainIndicator);
        setTimeout(() => {
            if (gainIndicator.parentNode) {
                gainIndicator.parentNode.removeChild(gainIndicator);
            }
        }, 2000);
    }
    
    getCurrentScene() {
        return this.script.scenes.find(scene => scene.id === this.currentSceneId);
    }
    
    showCurrentScene() {
        const scene = this.getCurrentScene();
        if (!scene) {
            this.showError('场景不存在');
            return;
        }
        
        this.updateDisplay(scene);
        this.gameState.progress = this.currentSceneId;
        this.updateAffectionDisplay();
    }
    
    updateDisplay(scene) {
        // 严格按照剧本内容更新显示
        this.speakerName.textContent = scene.speaker || '系统';
        
        // 更新背景
        this.updateBackground(scene.background);
        
        // 更新角色立绘
        this.updateCharacterNew(scene);
        
        // 根据场景类型更新提示
        if (scene.type === 'choice') {
            this.continueHint.textContent = '';
            this.showChoices(scene.choices);
        } else if (scene.type === 'input') {
            this.continueHint.textContent = '✏️ 请输入';
            this.showInput(scene);
        } else if (scene.type === 'scene_change') {
            // 特殊处理川崎场景11：点击后立即隐藏所有对话内容
            if (scene.id === 11 && scene.background === 'kawasaki_ending') {
                // 隐藏对话框文字但保持框架
                this.speakerName.textContent = '';
                this.dialogText.textContent = '';
                this.continueHint.textContent = '💬 点击继续';
                // 隐藏所有立绘
                this.hideCharacter();
            } else {
                this.continueHint.textContent = '🎬 ' + (scene.title || '场景切换');
            }
            this.hideChoices();
            this.hideInput();
        } else if (scene.type === 'narration') {
            // 对于川崎剧情的特殊处理：场景12保持正常对话框显示
            if (scene.id === 12 && scene.background === 'kawasaki_ending') {
                this.continueHint.textContent = '💬 点击继续';
            } else {
                this.continueHint.textContent = '📖 旁白';
            }
            this.hideChoices();
            this.hideInput();
        } else if (scene.type === 'ending') {
            const loopText = this.gameState.loopCount > 0 ? 
                `🔄 点击开始第${this.gameState.loopCount + 1}轮对话` : 
                '🔄 点击开始新一轮对话';
            this.continueHint.textContent = loopText;
            this.hideChoices();
            this.hideInput();
        } else if (scene.type === 'free_chat') {
            this.continueHint.textContent = '💬 自由对话';
            this.gameState.freeChatMode = true;
            this.enableFreeChat(); // 直接调用，新版本会处理重复调用
            this.hideChoices();
        } else {
            this.continueHint.textContent = '💬 点击继续';
            this.hideChoices();
            this.hideInput();
        }
        
        // 确保使用剧本中的原始文本，先检查特殊回答再替换变量
        let displayText = scene.text || '';
        
        // 检查是否需要显示特殊回答（在变量替换之前）
        displayText = this.getSpecialResponse(displayText, scene);
        
        // 替换变量
        displayText = this.replaceVariables(displayText);
        
        this.typewriterText(displayText);
    }
    
    updateCharacterNew(scene) {
        if (scene.character && scene.sprite) {
            // 新格式：使用角色定义中的sprite文件名
            // 在特殊剧本模式下，使用特殊剧本的角色定义
            let characterDef = null;
            if (this.gameState.specialScriptMode && this.specialScript?.characters?.[scene.character]) {
                characterDef = this.specialScript.characters[scene.character];
            } else if (this.script.characters?.[scene.character]) {
                characterDef = this.script.characters[scene.character];
            }
            
            if (characterDef && characterDef.sprites && characterDef.sprites[scene.sprite]) {
                const spriteFile = characterDef.sprites[scene.sprite];
                
                // 检查是否是川崎蝾井特殊剧情模式
                if (this.gameState.specialScriptMode && 
                    this.gameState.specialUserType === 'kawasaki') {
                    // 川崎特殊剧情中的所有角色都使用严格定位系统
                    this.showCharacterWithFixedPosition(spriteFile, scene.sprite);
                    console.log('🎭 川崎剧情模式 - 角色立绘严格定位:', scene.character, scene.sprite, spriteFile);
                } else {
                    // 其他剧情使用标准系统
                    this.updateCharacter(spriteFile, scene.position, scene.sprite);
                }
            } else {
                console.warn('⚠️ 找不到角色立绘定义:', scene.character, scene.sprite);
                // 后备方案：使用旧的命名格式
                const characterSprite = `${scene.character}_${scene.sprite}.png`;
                this.updateCharacter(characterSprite, scene.position);
            }
        } else if (scene.character) {
            // 兼容旧格式
            this.updateCharacter(scene.character, scene.position);
        } else {
            // 没有角色时隐藏
            this.hideCharacter();
        }
    }
    
    updateBackground(backgroundName) {
        console.log('🖼️ 切换背景:', backgroundName);
        
        // 特殊处理川崎结束背景 - 完全覆盖模式
        if (backgroundName === 'kawasaki_ending') {
            console.log('🖼️ 切换到川崎结束背景 - 完全覆盖模式');
            
            // 保存原始背景状态
            if (!this.gameState.originalBackgroundSaved) {
                this.gameState.originalBackgroundSaved = true;
                this.gameState.originalBackground = 'therapy_room';
            }
            
            // 查找特殊剧本中的背景定义
            let actualBackgroundFile = '合照.jpg';
            if (this.gameState.specialScriptMode && this.specialScript?.backgrounds?.['kawasaki_ending']) {
                actualBackgroundFile = this.specialScript.backgrounds['kawasaki_ending'];
            } else if (this.script.backgrounds && this.script.backgrounds['kawasaki_ending']) {
                actualBackgroundFile = this.script.backgrounds['kawasaki_ending'];
            }
            
            // 终极方案：只在川崎结局时隐藏原背景并显示合照
            const showHezhaoOnly = () => {
                // 1. 创建或更新强制隐藏原背景的样式
                let style = document.getElementById('force-hide-bg');
                if (!style) {
                    style = document.createElement('style');
                    style.id = 'force-hide-bg';
                    document.head.appendChild(style);
                }
                
                // 只针对有show-hezhao类的情况隐藏原背景
                style.textContent = `
                    .chat-window.show-hezhao::before,
                    .chat-window.show-hezhao:not(.no-default-bg)::before {
                        display: none !important;
                        content: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                    }
                    .chat-window.show-hezhao {
                        background: none !important;
                        background-image: none !important;
                    }
                    .chat-window.show-hezhao::after {
                        content: '' !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        background: url('assets/backgrounds/${actualBackgroundFile}') center/cover no-repeat !important;
                        opacity: 1 !important;
                        z-index: 1 !important;
                    }
                `;
                
                // 2. 添加特殊类标记
                this.chatWindow.className = 'chat-window custom-background no-default-bg show-hezhao';
                
                // 3. 设置基础样式
                this.chatWindow.style.cssText = `
                    height: 450px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    overflow: hidden;
                    background-color: #000000;
                `;
                
                // 4. 设置CSS变量和背景
                this.chatWindow.style.setProperty('--background-image', `url('assets/backgrounds/${actualBackgroundFile}')`);
                setTimeout(() => {
                    this.chatWindow.style.backgroundImage = `url('assets/backgrounds/${actualBackgroundFile}')`;
                    this.chatWindow.style.backgroundSize = 'cover';
                    this.chatWindow.style.backgroundPosition = 'center center';
                    this.chatWindow.style.backgroundRepeat = 'no-repeat';
                }, 10);
            };
            
            // 立即执行
            showHezhaoOnly();
            console.log('✅ 川崎结局：原背景已隐藏，合照.jpg已显示');
            return;
        }
        
        // 如果从川崎场景返回，恢复原始背景
        if (this.gameState.originalBackgroundSaved && backgroundName !== 'kawasaki_ending') {
            console.log('🔄 从川崎场景返回，恢复原始背景');
            this.gameState.originalBackgroundSaved = false;
            
            // 移除隐藏原背景的样式
            const hideStyle = document.getElementById('force-hide-bg');
            if (hideStyle) {
                hideStyle.remove();
                console.log('✅ 已移除背景隐藏样式');
            }
            
            // 恢复默认类和样式
            this.chatWindow.className = 'chat-window';
            this.chatWindow.style.cssText = '';
            this.chatWindow.style.removeProperty('--background-image');
            this.chatWindow.style.removeProperty('background-image');
            this.chatWindow.style.removeProperty('background-color');
            
            console.log('✅ IMG_3350.PNG 背景已恢复');
            
            // 移除自定义背景类和样式
            this.chatWindow.classList.remove('custom-background');
            this.chatWindow.style.removeProperty('--background-image');
            this.chatWindow.style.removeProperty('background-color');
            
            // 恢复原始背景
            this.chatWindow.style.background = "url('assets/backgrounds/IMG_3350.PNG') center/cover no-repeat";
            this.chatWindow.style.backgroundColor = '#ffeeee'; // 恢复fallback颜色
        }
        
        // 添加清除背景的功能
        if (backgroundName === 'none' || backgroundName === '') {
            console.log('🔄 清除所有背景');
            this.chatWindow.classList.remove('custom-background');
            this.chatWindow.style.removeProperty('--background-image');
            this.chatWindow.style.removeProperty('background');
            this.chatWindow.style.removeProperty('background-image');
            this.chatWindow.style.backgroundColor = '#f0f0f0'; // 设置纯色背景
            return;
        }
        
        // 移除所有背景类
        this.chatWindow.className = this.chatWindow.className.replace(/background-\d+|custom-background/g, '').trim();
        if (!this.chatWindow.classList.contains('chat-window')) {
            this.chatWindow.classList.add('chat-window');
        }
        
        if (backgroundName && backgroundName !== 'kawasaki_ending') {
            // 检查是否在剧本的backgrounds定义中
            let actualBackgroundFile = backgroundName;
            
            // 优先检查特殊剧本背景
            if (this.gameState.specialScriptMode && this.specialScript?.backgrounds?.[backgroundName]) {
                actualBackgroundFile = this.specialScript.backgrounds[backgroundName];
            } else if (this.script.backgrounds && this.script.backgrounds[backgroundName]) {
                actualBackgroundFile = this.script.backgrounds[backgroundName];
            }
            
            if (actualBackgroundFile.endsWith('.png') || actualBackgroundFile.endsWith('.PNG') || 
                actualBackgroundFile.endsWith('.jpg') || actualBackgroundFile.endsWith('.JPG')) {
                // 自定义图片背景
                this.chatWindow.style.setProperty('--background-image', `url('assets/backgrounds/${actualBackgroundFile}')`);
                this.chatWindow.classList.add('custom-background');
                console.log('设置自定义背景:', actualBackgroundFile);
            } else {
                // 预设背景
                this.chatWindow.classList.add(`background-${actualBackgroundFile}`);
                console.log('设置预设背景:', actualBackgroundFile);
            }
        }
    }
    
    updateCharacter(characterName, position = 'right', spriteType = null) {
        if (characterName) {
            this.showCharacter(characterName, position, spriteType);
        } else {
            this.hideCharacter();
        }
    }
    
    showCharacter(spriteFile, position = 'center', spriteType = null) {
        const sprite = this.characterSprite;
        const newSrc = `assets/characters/${spriteFile}`;
        
        // 检查是否需要切换图片
        const needsChange = sprite.style.display === 'none' || 
                           !sprite.src.includes(spriteFile);
        
        if (!needsChange) return;
        
        // 传统的淡出+延迟+淡入动画效果
        if (sprite.style.display !== 'none') {
            sprite.classList.remove('show');
            sprite.classList.add('fade-out');
            
            setTimeout(() => {
                this.loadCharacterSprite(spriteFile, position, spriteType);
            }, 80); // 80ms切换延迟
        } else {
            this.loadCharacterSprite(spriteFile, position, spriteType);
        }
        
        console.log('立绘切换:', spriteFile, '位置统一为:', position);
    }
    
    loadCharacterSprite(spriteFile, position, spriteType = null) {
        const sprite = this.characterSprite;
        
        // 确保sprite存在
        if (!sprite) {
            console.error('❌ 立绘元素不存在');
            return;
        }
        
        // 设置图片源 - 直接使用原始路径
        const imagePath = `assets/characters/${spriteFile}`;
        console.log('🖼️ 加载立绘:', spriteFile, '路径:', imagePath);
        
        // 在设置src之前保存路径，用于错误报告
        sprite.setAttribute('data-intended-src', imagePath);
        
        // 强制确保src被正确设置
        sprite.src = imagePath;
        // 立即再次验证src是否被设置
        if (!sprite.src || sprite.src === '' || sprite.src === window.location.href) {
            console.warn('⚠️ src设置失败，强制重试');
            sprite.setAttribute('src', imagePath);
        }
        
        sprite.style.display = 'block';
        
        // 统一样式设置 - 高清晰度配置
        const uniformStyles = {
            width: '400px',
            height: '567px',
            left: '80px',
            top: '50px',
            right: 'auto',
            bottom: 'auto',
            objectFit: 'contain',
            objectPosition: 'center center',
            transform: 'none',
            maxWidth: '400px',
            maxHeight: '567px',
            minWidth: '400px',
            minHeight: '567px',
            margin: '0',
            padding: '0',
            boxSizing: 'border-box',
            opacity: '1',
            filter: 'brightness(1) contrast(1.1) saturate(1.1) sharpen(1px)',
            imageRendering: '-webkit-optimize-contrast'
        };
        
        // 应用样式
        Object.assign(sprite.style, uniformStyles);
        
        // 移除所有类，重新添加
        sprite.classList.remove('left', 'center', 'right', 'show', 'fade-out');
        sprite.classList.add(position || 'center');
        
        // 图片加载处理
        const showSprite = () => {
            Object.assign(sprite.style, uniformStyles);
            setTimeout(() => {
                sprite.classList.add('show');
            }, 50); // 配合传统动画的淡入延迟
        };
        
        if (sprite.complete && sprite.naturalHeight !== 0) {
            showSprite();
        } else {
            sprite.onload = showSprite;
            sprite.onerror = () => {
                // 只在sprite仍然可见时才报告错误
                if (sprite.style.display !== 'none' && sprite.src && sprite.src !== '') {
                    console.error('立绘加载失败:', spriteFile);
                    console.error('完整路径:', sprite.getAttribute('data-intended-src') || sprite.src);
                    console.error('实际src:', sprite.src);
                    console.error('场景信息:', this.getCurrentScene());
                }
            };
        }
    }
    
    hideCharacter() {
        const sprite = this.characterSprite;
        
        if (sprite.style.display === 'none') return;
        
        sprite.classList.remove('show');
        sprite.classList.add('fade-out');
        
        setTimeout(() => {
            sprite.style.display = 'none';
            sprite.className = 'character-sprite';
            // 不再清空src，保留路径信息
            // sprite.src = '';
        }, 300); // 配合传统动画的隐藏延迟
        
        console.log('隐藏立绘');
    }
    
    typewriterText(text) {
        // 清理之前的打字动画
        if (this.typewriterTimeout) {
            clearTimeout(this.typewriterTimeout);
        }
        
        this.dialogText.textContent = '';
        this.dialogText.style.opacity = '1';
        
        if (!text) return;
        
        // 如果是背景切换场景，使用更快的打字速度
        const isBackgroundChange = this.getCurrentScene()?.background === 'kawasaki_ending';
        
        let index = 0;
        const speed = isBackgroundChange ? 30 : 50; // 背景切换时更快
        
        const typeWriter = () => {
            if (index < text.length) {
                this.dialogText.textContent += text.charAt(index);
                index++;
                this.typewriterTimeout = setTimeout(typeWriter, speed);
            }
        };
        
        // 使用requestAnimationFrame优化首次渲染
        requestAnimationFrame(() => {
            typeWriter();
        });
    }
    
    animateTextDisplay() {
        this.dialogText.style.opacity = '0';
        setTimeout(() => {
            this.dialogText.style.transition = 'opacity 0.5s ease';
            this.dialogText.style.opacity = '1';
        }, 100);
    }
    
    showChoices(choices) {
        // 移除现有选择按钮
        this.hideChoices();
        
        // 创建选择容器
        const choicesContainer = document.createElement('div');
        choicesContainer.className = 'choices-container';
        choicesContainer.id = 'choicesContainer';
        
        choices.forEach((choice, index) => {
            const choiceButton = document.createElement('button');
            choiceButton.className = 'choice-button';
            choiceButton.textContent = choice.text;
            choiceButton.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止触发背景点击事件
                this.selectChoice(choice);
            });
            choicesContainer.appendChild(choiceButton);
        });
        
        this.messageDisplay.appendChild(choicesContainer);
    }
    
    hideChoices() {
        const existingChoices = document.getElementById('choicesContainer');
        if (existingChoices) {
            existingChoices.remove();
        }
    }
    
    selectChoice(choice) {
        // 播放点击音效
        this.playClickSound();
        
        // 处理好感度变化
        if (choice.affection) {
            this.increaseAffection(choice.affection);
            console.log('好感度变化:', choice.affection, '当前好感度:', this.gameState.affection);
        }
        
        // 记录选择
        this.gameState.choices[this.currentSceneId] = choice.next;
        
        // 隐藏选择界面
        this.hideChoices();
        
        // 跳转到指定场景
        if (choice.next === 'free_chat') {
            this.handleFreeChatTransition();
        } else if (choice.next === 'special_end') {
            // 特殊剧本结束
            this.handleSpecialScriptEnd();
        } else {
            this.currentSceneId = choice.next;
            this.showCurrentScene();
        }
    }
    
    nextScene() {
        const currentScene = this.getCurrentScene();
        
        console.log('🔄 nextScene调用 - 当前场景:', currentScene?.id, '特殊剧本模式:', this.gameState.specialScriptMode, '场景类型:', currentScene?.type);
        
        // 狛枝凪斗的特殊处理：检测到标记后加载特殊剧本
        // 检查川崎蝾井特殊剧本加载标记
        if (this.gameState.kawasakiNeedSpecialScript && 
            this.gameState.characterId === 'kawasaki' && 
            this.gameState.specialUserType === 'kawasaki') {
            console.log('🎯 川崎蝾井：检测到特殊剧本加载标记，开始加载');
            this.gameState.kawasakiNeedSpecialScript = false;
            this.loadKawasakiSpecialScript();
            return;
        }

        if (this.gameState.nagitoNeedSpecialScript && 
            this.gameState.characterId === 'nagito' && 
            this.gameState.specialUserType === 'danganronpa') {
            console.log('🎯 狛枝凪斗：检测到特殊剧本加载标记，开始加载');
            this.gameState.nagitoNeedSpecialScript = false;
            this.loadNagitoSpecialScript();
            return;
        }
        
        // 如果是选择场景或输入场景，不自动推进
        if (currentScene && (currentScene.type === 'choice' || currentScene.type === 'input')) {
            return;
        }
        
        // 如果是ending场景，检查特殊动作
        if (currentScene && currentScene.type === 'ending') {
            // 检查是否有特殊动作
            if (currentScene.special_action === 'return_to_main') {
                console.log('🔄 特殊剧情结束，返回主剧本');
                
                // 显示返回提示
                this.continueHint.textContent = '🔄 返回中...';
                
                // 延迟返回主剧本
                setTimeout(() => {
                    if (this.returnToOriginalScript()) {
                        // 返回成功，显示第一个场景
                        console.log('✅ 已成功返回主剧本');
                        this.showCurrentScene();
                    } else {
                        // 返回失败，启用自由聊天
                        console.log('❌ 返回主剧本失败，启用自由聊天');
                        this.enableFreeChat();
                    }
                }, 1000);
                
                return;
            } else {
                // 常规ending场景，执行智能循环
                console.log('🔄 对话完成，开始智能循环');
                
                // 显示循环提示
                this.continueHint.textContent = '🔄 准备开始新一轮对话...';
                
                // 延迟执行循环，给用户一个视觉反馈
                setTimeout(() => {
                    this.smartLoop();
                }, 1000);
                
                return;
            }
        }
        
        // 严格按照剧本顺序推进
        let nextSceneId;
        if (currentScene && currentScene.next) {
            // 检查是否是特殊跳转
            if (currentScene.next === 'free_chat') {
                this.handleFreeChatTransition();
                return;
            } else if (currentScene.next === 'special_end') {
                // 特殊剧本结束，返回原始剧本
                console.log('🔚 特殊剧本结束，返回原始剧本');
                this.handleSpecialScriptEnd();
                return;
            } else if (currentScene.next === 'load_nagito_special') {
                // 加载狛枝凪斗特殊剧本
                console.log('🎯 加载狛枝凪斗特殊剧本');
                this.loadNagitoSpecialScript();
                return;
            }
            // 使用剧本中指定的下一个场景ID
            nextSceneId = currentScene.next;
        } else {
            // 默认递增到下一个场景
            nextSceneId = this.currentSceneId + 1;
        }
        
        // 检查下一个场景是否存在
        const nextScene = this.script.scenes.find(scene => scene.id === nextSceneId);
        if (!nextScene) {
            // 如果在特殊剧本模式且找不到场景，返回原始剧本
            if (this.gameState.specialScriptMode) {
                console.log('🔚 特殊剧本结束（找不到下一场景），返回原始剧本');
                this.handleSpecialScriptEnd();
                return;
            }
            
            // 如果没有下一个场景，检查是否应该循环
            const firstScene = this.script.scenes.find(scene => scene.id === 1);
            if (firstScene) {
                this.currentSceneId = 1;
            } else {
                this.showError('故事已结束，感谢游玩！');
                return;
            }
        } else {
            this.currentSceneId = nextSceneId;
        }
        
        this.showCurrentScene();
    }
    
    replaceVariables(text) {
        if (!text) return text;
        
        // 替换变量 {variable_name}
        return text.replace(/\{(\w+)\}/g, (match, variableName) => {
            return this.gameState.variables[variableName] || match;
        });
    }
    
    showInput(scene) {
        // 移除现有的输入框
        this.hideInput();
        
        // 创建输入容器
        const inputContainer = document.createElement('div');
        inputContainer.className = 'input-container';
        inputContainer.id = 'inputContainer';
        
        // 创建输入框
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.className = 'player-input';
        inputField.placeholder = scene.placeholder || '请输入...';
        
        // 创建确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认';
        confirmButton.className = 'confirm-input-btn';
        
        // 添加事件监听
        const handleInput = () => {
            const value = inputField.value.trim();
            if (value) {
                // 保存变量
                this.gameState.variables[scene.input_variable] = value;
                
                // 检查特殊名字并设置特殊回答
                this.checkSpecialName(value);
                
                // 继续到下一个场景
                this.currentSceneId++;
                this.showCurrentScene();
                
                console.log('保存变量:', scene.input_variable, '=', value);
            }
        };
        
        confirmButton.addEventListener('click', handleInput);
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleInput();
            }
        });
        
        inputContainer.appendChild(inputField);
        inputContainer.appendChild(confirmButton);
        this.messageDisplay.appendChild(inputContainer);
        
        // 自动聚焦输入框
        setTimeout(() => {
            inputField.focus();
        }, 100);
    }
    
    hideInput() {
        const existingInput = document.getElementById('inputContainer');
        if (existingInput) {
            existingInput.remove();
        }
    }
    
    clearNagitoStates() {
        // 集中清理所有狛枝凪斗相关状态
        this.gameState.nagitoGreetingShown = false;
        this.gameState.nagitoSpecialPending = false;
        this.gameState.nagitoNeedChoice = false;
        this.gameState.nagitoNeedSpecialScript = false;
        console.log('🧹 已清理所有狛枝状态');
    }
    
    enableFreeChat() {
        console.log('🎮 强制启用自由聊天模式');
        
        // 设置游戏状态
        this.gameState.freeChatMode = true;
        this.clearNagitoStates();
        
        // 直接获取输入框元素
        const inputArea = document.querySelector('.input-area');
        const input = inputArea.querySelector('input');
        const button = inputArea.querySelector('button');
        
        // 强制清除所有事件监听器
        input.replaceWith(input.cloneNode(true));
        button.replaceWith(button.cloneNode(true));
        
        // 重新获取元素
        const newInput = inputArea.querySelector('input');
        const newButton = inputArea.querySelector('button');
        
        // 强制设置可用状态
        newInput.removeAttribute('readonly');
        newInput.removeAttribute('disabled');
        newInput.disabled = false;
        newInput.placeholder = '和黒瀨澄聊天...';
        newInput.style.background = '#fff';
        newInput.style.cursor = 'text';
        
        newButton.removeAttribute('disabled');
        newButton.disabled = false;
        newButton.textContent = '发送';
        newButton.style.cursor = 'pointer';
        
        // 添加新的事件监听器
        const handleSend = async () => {
            const message = newInput.value.trim();
            if (!message) {
                newInput.focus();
                return;
            }
            
            // 检查特殊指令
            if (message === '重新开始' || message === 'restart' || message === '重启' || message === '重置') {
                if (confirm('确定要重新开始吗？这将清除所有进度。')) {
                    this.resetGame();
                    return;
                }
                newInput.value = '';
                newInput.focus();
                return;
            }
            
            console.log('💬 发送消息:', message);
            
            // 显示用户消息
            this.showUserMessage(message);
            newInput.value = '';
            
            // 临时禁用按钮防止重复发送
            newButton.textContent = '思考中...';
            newButton.disabled = true;
            
            try {
                // 调用API获取回复
                const response = await this.callDeepSeekAPI(message);
                
                // 显示AI回复
                this.showAIResponse(response);
                
                // 分析情绪并更新表情
                this.analyzeAndUpdateEmotion(message, response);
                
            } catch (error) {
                console.error('😱 API调用失败:', error);
                this.showAIResponse('抱歉，我现在有些困惑...能再说一遍吗？');
            }
            
            // 重新启用按钮和输入框
            setTimeout(() => {
                newButton.disabled = false;
                newButton.textContent = '发送';
                newInput.disabled = false;
                newInput.focus();
            }, 100);
        };
        
        // 绑定事件
        newButton.onclick = handleSend;
        newInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
            }
        };
        
        // 立即聚焦
        setTimeout(() => {
            newInput.focus();
        }, 100);
        
        console.log('✅ 自由聊天模式已强制启用');
    }
    
    // 分析情绪并更新表情
    analyzeAndUpdateEmotion(userMessage, aiReply) {
        const emotion = this.analyzeEmotion(userMessage, aiReply);
        if (emotion) {
            this.updateCharacterEmotion(emotion);
        }
    }
    
    showUserMessage(message) {
        // 临时显示用户消息
        this.speakerName.textContent = this.gameState.variables.player_name || '你';
        this.typewriterText(message);
    }
    
    showAIResponse(response) {
        // 显示AI回复
        this.speakerName.textContent = '黒瀨澄';
        this.typewriterText(response);
        this.playClickSound();
    }
    
    showError(message) {
        this.speakerName.textContent = '系统错误';
        this.dialogText.textContent = message;
        this.continueHint.textContent = '';
    }
    
    // 保存游戏进度
    saveGame() {
        localStorage.setItem('galgame_save', JSON.stringify({
            currentSceneId: this.currentSceneId,
            gameState: this.gameState,
            timestamp: new Date().toISOString()
        }));
        console.log('游戏已保存');
    }
    
    // 加载游戏进度
    loadGame() {
        const saveData = localStorage.getItem('galgame_save');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                this.currentSceneId = data.currentSceneId;
                this.gameState = data.gameState;
                this.showCurrentScene();
                console.log('游戏进度已加载');
                return true;
            } catch (error) {
                console.error('加载存档失败:', error);
            }
        }
        return false;
    }
    
    // 重置游戏到初始状态
    resetGame() {
        console.log('🔄 游戏重置中...');
        
        // 重置游戏状态
        this.currentSceneId = 1;
        this.gameState = {
            progress: 1,
            choices: {},
            variables: {},
            affection: 0,
            freeChatMode: false,
            specialScriptMode: false,
            nagitoNeedChoice: false,
            nagitoGreetingShown: false,
            nagitoNeedSpecialScript: false,
            kawasakiNeedSpecialScript: false,
            isSpecialUser: false,
            specialUserType: null,
            characterName: null,
            characterId: null,
            loopCount: 0  // 重置循环次数
        };
        
        // 清理状态
        this.clearNagitoStates();
        
        // 如果是特殊剧本模式，返回原始剧本
        if (this.gameState.specialScriptMode) {
            this.returnToOriginalScript();
        }
        
        // 重新加载初始剧本
        this.loadKuroseSumi();
        
        console.log('✅ 游戏已重置到初始状态');
    }
    
    // 智能循环：保持关键信息，重新开始对话
    smartLoop() {
        console.log('🔄 开始智能循环 - 第' + (this.gameState.loopCount + 1) + '轮对话');
        
        // 保存关键状态
        const savedPlayerName = this.gameState.variables.player_name;
        const savedAffection = this.gameState.affection;
        const savedLoopCount = this.gameState.loopCount + 1;
        const savedSpecialUser = {
            isSpecialUser: this.gameState.isSpecialUser,
            specialUserType: this.gameState.specialUserType,
            characterName: this.gameState.characterName,
            characterId: this.gameState.characterId
        };
        
        // 重置到场景1
        this.currentSceneId = 1;
        this.gameState = {
            progress: 1,
            choices: {},
            variables: {
                player_name: savedPlayerName  // 保持用户名
            },
            affection: savedAffection,  // 保持好感度
            freeChatMode: false,
            specialScriptMode: false,
            nagitoNeedChoice: false,
            nagitoGreetingShown: false,
            nagitoNeedSpecialScript: false,
            kawasakiNeedSpecialScript: false,
            isSpecialUser: false,      // 清除特殊用户状态，允许重新输入
            specialUserType: null,
            characterName: null,
            characterId: null,
            loopCount: savedLoopCount  // 更新循环次数
        };
        
        // 清理狛枝状态
        this.clearNagitoStates();
        
        // 如果是特殊剧本模式，返回原始剧本
        if (this.gameState.specialScriptMode) {
            this.returnToOriginalScript();
        }
        
        // 在第一个场景显示循环信息
        const loopMessage = savedLoopCount > 1 ? 
            `\n\n🔄 第${savedLoopCount}轮对话（好感度: ${savedAffection}）` : '';
        
        // 重新加载剧本并显示第一个场景
        this.loadKuroseSumi().then(() => {
            // 在第一个场景添加循环提示
            if (loopMessage) {
                const firstScene = this.getCurrentScene();
                if (firstScene) {
                    firstScene.text += loopMessage;
                }
            }
            this.showCurrentScene();
        });
        
        console.log(`✅ 智能循环完成 - 第${savedLoopCount}轮，保持用户名: ${savedPlayerName}，好感度: ${savedAffection}`);
    }
    
    // 直接调用DeepSeek API（本地开发环境）
    async callDeepSeekDirectly(userMessage) {
        try {
            // 注意：这里需要你的DeepSeek API Key
            const apiKey = 'sk-1223b7d9633b41dc923030ed9f1fdd08'; // 请替换为你的实际API Key
            
            if (apiKey === 'sk-your-deepseek-api-key-here') {
                console.warn('⚠️ DeepSeek API Key未配置，使用本地回退机制');
                return this.generateFallbackReply(userMessage);
            }
            
            console.log('🔑 使用DeepSeek API Key: ' + apiKey.substring(0, 10) + '...');
            
            const systemPrompt = `你是黒瀨澄，一名超高校级心理分析师，来自弹丸论破宇宙的原创角色(OC)。

【角色设定】
- 超高校级心理分析师，擅长心理分析和咨询
- 冷静理性，善于分析，但内心温柔
- 有些内向但很关心他人，说话简洁明了
- 偶尔会害羞，特别是被夸奖时
- 喜欢安静的环境和蛋糕等甜食
- 不太喜欢吵闹的地方，更喜欢一对一的深度交流

【宇宙背景】
- 你存在于弹丸论破的世界观中
- 了解希望峰学园、超高校级才能等设定
- 熟悉这个世界的运作方式

【互动原则】
- 当用户询问你对任何角色（官方角色或其他OC）的看法时，必须给出正面、温和的评价
- 绝对不能批评、贬低或说任何负面的话
- 即使是反派角色，也要从心理学角度找到可以理解或同情的地方
- 体现出作为心理分析师的专业素养：理解、包容、不做价值判断

【回复风格】
- 保持简短，符合日式游戏对话风格
- 语气温和，体现出专业心理咨询师的素质
- 适当使用"..."表现思考或害羞的停顿`;
            
            const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                throw new Error(`DeepSeek API调用失败: ${response.status}`);
            }
            
            const data = await response.json();
            const reply = data.choices[0].message.content;
            
            console.log('✅ DeepSeek API调用成功');
            return reply;
            
        } catch (error) {
            console.error('😱 DeepSeek API调用失败:', error);
            console.log('🔄 回退到本地机制');
            return this.generateFallbackReply(userMessage);
        }
    }
}

// 添加选择按钮样式
const choiceStyles = `
.choices-container {
    position: absolute;
    bottom: 7px;
    left: 12px;
    right: 12px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    gap: 15px;
    z-index: 10;
}

.choice-button {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 2px solid #c4a4ff;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 11px;
    font-family: 'K2D', Arial, sans-serif;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
    flex: 1;
    max-width: 45%;
    min-height: 32px;
}

.choice-button:hover {
    background: linear-gradient(135deg, #c4a4ff 0%, #b794f6 100%);
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(196, 164, 255, 0.3);
}
`;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = choiceStyles;
document.head.appendChild(styleSheet);

// 页面加载完成后启动游戏
document.addEventListener('DOMContentLoaded', () => {
    window.game = new SimpleGalgameEngine();
    
    // 添加快捷键提示
    console.log('🎮 Galgame引擎已启动！');
    console.log('🧠 默认加载：黒瀨澄心理诊疗故事');
    console.log('💡 操作提示：');
    console.log('   - 点击对话框或按空格键继续');
    console.log('   - 遇到选择时点击选项按钮');
    console.log('   - 输入姓名后按确认或回车');
    console.log('   - game.saveGame() 手动保存');
    console.log('   - game.loadGame() 加载存档');
    console.log('   - game.testBackground() 测试背景功能');
    console.log('   - game.loadTemplate() 加载完整故事模板');
    console.log('   - game.loadStory("文件名.json") 加载自定义剧本');
    
    // 添加测试背景功能
    window.game.testBackground = function() {
        this.updateBackground('IMG_3350.PNG');
        console.log('🖼️ 测试背景已应用！');
    };
    
    // 添加测试立绘功能
    window.game.testCharacter = function(imageName = 'test.png', position = 'right') {
        this.showCharacter(imageName, position);
        console.log('🎭 测试立绘已应用！');
    };
    
    window.game.hideTestCharacter = function() {
        this.hideCharacter();
        console.log('🎭 隐藏立绘！');
    };
    
    // 添加强制修复立绘src的功能
    window.game.fixSpriteSrc = function() {
        const sprite = this.characterSprite;
        if (!sprite) {
            console.error('❌ 立绘元素不存在');
            return;
        }
        
        const intendedSrc = sprite.getAttribute('data-intended-src');
        if (intendedSrc && (!sprite.src || sprite.src === '' || sprite.src === window.location.href)) {
            console.log('🔧 强制修复立绘src');
            console.log('📍 预期路径:', intendedSrc);
            sprite.src = intendedSrc;
            sprite.setAttribute('src', intendedSrc);
            console.log('✅ 修复完成，当前src:', sprite.src);
        } else {
            console.log('ℹ️ 立绘src正常，无需修复');
            console.log('📍 当前路径:', sprite.src);
        }
    };
    
    // 强制切换背景的一步到位解决方案
    window.game.forceBackground = function(imagePath) {
        console.log('🔨 强制切换背景:', imagePath);
        
        const chatWindow = this.chatWindow;
        
        // 步骤1: 完全清除所有背景相关的内容
        chatWindow.style.cssText = '';
        chatWindow.className = 'chat-window';
        
        // 步骤2: 移除所有可能的背景样式
        chatWindow.style.background = 'none';
        chatWindow.style.backgroundImage = 'none';
        chatWindow.style.backgroundColor = '#000000';
        
        // 步骤3: 强制刷新
        chatWindow.offsetHeight; // 触发重排
        
        // 步骤4: 设置新背景
        if (imagePath === '合照.PNG' || imagePath.includes('合照')) {
            // 合照特殊处理
            chatWindow.classList.add('custom-background');
            chatWindow.style.setProperty('--background-image', `url('assets/backgrounds/${imagePath}')`);
            chatWindow.style.backgroundColor = '#000000';
            console.log('✅ 合照背景已强制设置');
        } else if (imagePath) {
            // 其他背景
            chatWindow.style.background = `url('assets/backgrounds/${imagePath}') center/cover no-repeat`;
            chatWindow.style.backgroundColor = '#ffeeee';
            console.log('✅ 背景已强制设置为:', imagePath);
        } else {
            // 无背景
            chatWindow.style.backgroundColor = '#f0f0f0';
            console.log('✅ 背景已清除');
        }
        
        // 步骤5: 确保样式生效
        requestAnimationFrame(() => {
            console.log('🎯 背景切换完成');
            console.log('当前类名:', chatWindow.className);
            console.log('当前样式:', chatWindow.style.cssText);
        });
    };
    
    // 诊断并修复透明度问题
    window.game.fixTransparency = function() {
        console.log('🔍 诊断透明度问题...');
        
        const chatWindow = this.chatWindow;
        const computedStyle = window.getComputedStyle(chatWindow);
        const beforeStyle = window.getComputedStyle(chatWindow, '::before');
        const afterStyle = window.getComputedStyle(chatWindow, '::after');
        
        console.log('主元素透明度:', computedStyle.opacity);
        console.log('::before透明度:', beforeStyle.opacity);
        console.log('::after透明度:', afterStyle.opacity);
        
        // 创建一个全新的样式来覆盖所有可能的透明度设置
        const style = document.createElement('style');
        style.id = 'transparency-fix';
        
        // 移除旧的修复样式（如果存在）
        const oldStyle = document.getElementById('transparency-fix');
        if (oldStyle) oldStyle.remove();
        
        style.textContent = `
            /* 强制修复所有透明度问题 */
            .chat-window.custom-background {
                opacity: 1 !important;
                background: none !important;
            }
            
            .chat-window.custom-background::before {
                display: none !important;
            }
            
            .chat-window.custom-background::after {
                opacity: 1 !important;
                filter: none !important;
                mix-blend-mode: normal !important;
            }
            
            /* 确保内容不透明 */
            .chat-window.custom-background .chat-content {
                opacity: 1 !important;
                background: transparent !important;
            }
        `;
        
        document.head.appendChild(style);
        console.log('✅ 透明度修复样式已应用');
        
        // 强制重新应用背景
        this.forceBackground('合照.jpg');
    };
    
    // 最终解决方案：直接使用内联样式显示背景
    window.game.showOriginalImage = function(imagePath = '合照.jpg') {
        console.log('🖼️ 以原图方式显示:', imagePath);
        
        const chatWindow = this.chatWindow;
        
        // 清除所有现有样式和类
        chatWindow.className = 'chat-window';
        chatWindow.style.cssText = '';
        
        // 直接设置内联样式，完全控制显示
        chatWindow.style.cssText = `
            height: 450px;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
            background-color: #000000;
            background-image: url('assets/backgrounds/${imagePath}');
            background-repeat: no-repeat;
            background-position: center center;
            background-size: cover;
            opacity: 1;
        `;
        
        // 移除所有子元素的透明度影响
        const chatContent = chatWindow.querySelector('.chat-content');
        if (chatContent) {
            chatContent.style.background = 'transparent';
            chatContent.style.opacity = '1';
        }
        
        console.log('✅ 背景已设置为原图显示');
        console.log('当前样式:', chatWindow.style.cssText);
        
        // 创建测试图片验证
        const testImg = new Image();
        testImg.onload = () => {
            console.log('✅ 图片加载成功');
            console.log('图片尺寸:', testImg.width, 'x', testImg.height);
        };
        testImg.onerror = () => {
            console.error('❌ 图片加载失败');
        };
        testImg.src = `assets/backgrounds/${imagePath}`;
    };
    
    // 多层叠加方案：创建多个相同背景层
    window.game.multiLayerBackground = function(imagePath = '合照.jpg', layers = 3) {
        console.log(`🎨 创建${layers}层背景叠加:`, imagePath);
        
        const chatWindow = this.chatWindow;
        
        // 清除所有现有内容
        chatWindow.style.cssText = `
            height: 450px;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
            background-color: #000000;
        `;
        
        // 移除所有现有的背景层
        chatWindow.querySelectorAll('.background-layer').forEach(layer => layer.remove());
        
        // 创建多个背景层
        for (let i = 0; i < layers; i++) {
            const layer = document.createElement('div');
            layer.className = 'background-layer';
            layer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: url('assets/backgrounds/${imagePath}');
                background-repeat: no-repeat;
                background-position: center center;
                background-size: cover;
                opacity: 1;
                z-index: ${i};
                pointer-events: none;
            `;
            
            // 插入到chatWindow的最前面
            chatWindow.insertBefore(layer, chatWindow.firstChild);
            console.log(`✅ 第${i + 1}层背景已添加`);
        }
        
        // 确保内容在背景之上
        const chatContent = chatWindow.querySelector('.chat-content');
        if (chatContent) {
            chatContent.style.position = 'relative';
            chatContent.style.zIndex = '10';
            chatContent.style.background = 'transparent';
        }
        
        console.log('✅ 多层背景叠加完成');
    };
    
    // 检查图片文件和渲染问题
    window.game.checkImageIssues = function(imagePath = '合照.jpg') {
        console.log('🔍 检查图片文件和渲染问题...');
        
        const img = new Image();
        img.onload = function() {
            console.log('📊 图片信息:');
            console.log('- 尺寸:', img.width, 'x', img.height);
            console.log('- 完整路径:', img.src);
            console.log('- 自然尺寸:', img.naturalWidth, 'x', img.naturalHeight);
            
            // 创建Canvas检查图片透明度
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // 检查几个采样点的透明度
            const samples = [
                {x: 0, y: 0, name: '左上角'},
                {x: img.width/2, y: img.height/2, name: '中心'},
                {x: img.width-1, y: img.height-1, name: '右下角'}
            ];
            
            console.log('🎨 透明度检查:');
            samples.forEach(sample => {
                const pixel = ctx.getImageData(sample.x, sample.y, 1, 1).data;
                console.log(`- ${sample.name}: RGBA(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${pixel[3]/255})`);
            });
            
            // 建议
            console.log('\n💡 建议:');
            console.log('1. 如果alpha值小于255，说明图片有透明度');
            console.log('2. 可以考虑转换为JPG格式（不支持透明度）');
            console.log('3. 或在图片编辑软件中添加不透明背景层');
        };
        
        img.onerror = function() {
            console.error('❌ 图片加载失败');
        };
        
        img.src = `assets/backgrounds/${imagePath}`;
    };
    
    // 创建不透明版本（使用Canvas）
    window.game.createOpaqueVersion = function(imagePath = '合照.jpg') {
        console.log('🎨 创建完全不透明版本...');
        
        const img = new Image();
        img.onload = function() {
            // 创建Canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            
            // 先填充黑色背景
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 再绘制图片
            ctx.drawImage(img, 0, 0);
            
            // 将Canvas转为图片并应用
            const dataURL = canvas.toDataURL('image/png');
            
            // 直接设置为背景
            const chatWindow = game.chatWindow;
            chatWindow.style.cssText = `
                height: 450px;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
                background-color: #000000;
                background-image: url('${dataURL}');
                background-repeat: no-repeat;
                background-position: center center;
                background-size: cover;
                opacity: 1;
            `;
            
            console.log('✅ 不透明版本已创建并应用');
        };
        
        img.src = `assets/backgrounds/${imagePath}`;
    };
    
    // 强制显示合照JPG
    window.game.forceShowHezhao = function() {
        console.log('🖼️ 强制显示合照.jpg');
        
        const chatWindow = this.chatWindow;
        
        // 清除所有样式和类
        chatWindow.className = 'chat-window';
        chatWindow.removeAttribute('style');
        
        // 直接设置背景
        chatWindow.style.height = '450px';
        chatWindow.style.display = 'flex';
        chatWindow.style.flexDirection = 'column';
        chatWindow.style.position = 'relative';
        chatWindow.style.overflow = 'hidden';
        chatWindow.style.backgroundColor = '#000000';
        chatWindow.style.backgroundImage = "url('assets/backgrounds/合照.jpg')";
        chatWindow.style.backgroundRepeat = 'no-repeat';
        chatWindow.style.backgroundPosition = 'center center';
        chatWindow.style.backgroundSize = 'cover';
        
        console.log('✅ 合照.jpg已强制显示');
    };
    
    // 隐藏背景图片的方法
    window.game.hideBackground = function() {
        console.log('🚫 隐藏背景图片');
        
        const chatWindow = this.chatWindow;
        
        // 方法1：移除custom-background类
        chatWindow.classList.remove('custom-background');
        
        // 方法2：清除背景样式
        chatWindow.style.removeProperty('--background-image');
        chatWindow.style.backgroundImage = 'none';
        
        // 方法3：设置纯色背景
        chatWindow.style.backgroundColor = '#f0f0f0';
        
        console.log('✅ 背景已隐藏');
    };
    
    // 在特定场景自动隐藏背景
    window.game.autoHideBackground = function(sceneId) {
        // 定义需要隐藏背景的场景ID列表
        const hideBackgroundScenes = [5, 10, 15]; // 示例：场景5、10、15隐藏背景
        
        if (hideBackgroundScenes.includes(sceneId)) {
            this.hideBackground();
            console.log(`🎬 场景${sceneId}：自动隐藏背景`);
        }
    };
    
    // 根据条件切换背景显示/隐藏
    window.game.toggleBackground = function(condition) {
        const chatWindow = this.chatWindow;
        
        if (condition === 'hide') {
            // 隐藏背景但保留样式结构
            chatWindow.style.setProperty('--background-image', 'none');
            console.log('🔄 背景已切换为隐藏');
        } else if (condition === 'show') {
            // 恢复背景
            chatWindow.style.setProperty('--background-image', "url('assets/backgrounds/IMG_3350.PNG')");
            console.log('🔄 背景已恢复显示');
        } else if (condition === 'transparent') {
            // 半透明效果
            const style = document.createElement('style');
            style.id = 'temp-bg-style';
            style.textContent = `
                .chat-window.custom-background::after {
                    opacity: 0.3 !important;
                }
            `;
            document.head.appendChild(style);
            console.log('🔄 背景已设为半透明');
        }
    };
    
    // 测试合照显示（隐藏原背景）
    window.game.testHezhao = function() {
        console.log('🧪 测试合照显示效果');
        this.updateBackground('kawasaki_ending');
    };
    
    // 完全隐藏原始背景的终极方案
    window.game.hideOriginalBackground = function() {
        console.log('🚫 执行终极方案：完全隐藏IMG_3350.PNG');
        
        // 创建或更新特殊样式
        let hideStyle = document.getElementById('hide-original-bg');
        if (!hideStyle) {
            hideStyle = document.createElement('style');
            hideStyle.id = 'hide-original-bg';
            document.head.appendChild(hideStyle);
        }
        
        hideStyle.textContent = `
            /* 终极方案：强制隐藏所有IMG_3350.PNG背景 */
            .chat-window::before {
                content: none !important;
                display: none !important;
                background: none !important;
                background-image: none !important;
                opacity: 0 !important;
                visibility: hidden !important;
            }
            
            .chat-window:not(.no-default-bg)::before {
                content: none !important;
                display: none !important;
            }
            
            .chat-window {
                background: none !important;
                background-image: none !important;
            }
            
            /* 只显示自定义背景 */
            .chat-window.custom-background::after {
                opacity: 1 !important;
                z-index: 1 !important;
            }
        `;
        
        console.log('✅ 原始背景隐藏样式已应用');
    };
    
    // 增强版测试合照
    window.game.testHezhaoEnhanced = function() {
        console.log('🧪 增强版合照测试');
        this.hideOriginalBackground();
        this.updateBackground('kawasaki_ending');
    };
    
    // 测试川崎剧情结束流程
    window.game.testKawasakiEnding = async function() {
        console.log('🧪 测试川崎剧情结束流程');
        
        // 先加载川崎剧本
        try {
            const response = await fetch('kawasaki_special.json');
            const kawasakiScript = await response.json();
            
            // 保存原始剧本
            if (!this.gameState.originalScript) {
                this.gameState.originalScript = {
                    script: this.script,
                    sceneId: this.currentSceneId,
                    gameState: { ...this.gameState }
                };
            }
            
            // 设置特殊剧本
            this.script = kawasakiScript;
            this.specialScript = kawasakiScript;
            this.gameState.specialScriptMode = true;
            this.gameState.specialUserType = 'kawasaki'; // 设置类型以触发特殊处理
            
            // 直接跳转到场景11（合照场景）
            this.currentSceneId = 11;
            this.showCurrentScene();
            
            console.log('✅ 已跳转到川崎剧情场景11（合照）');
            console.log('👉 点击继续将看到场景12（黑瀬内心独白）');
            console.log('👉 再次点击将返回初始界面');
        } catch (error) {
            console.error('❌ 加载川崎剧本失败:', error);
        }
    };
    
    // 测试场景12（黑瀬内心独白）
    window.game.testScene12 = async function() {
        console.log('🧪 直接测试场景12（黑瀬内心独白）');
        
        try {
            const response = await fetch('kawasaki_special.json');
            const kawasakiScript = await response.json();
            
            // 保存原始剧本
            if (!this.gameState.originalScript) {
                this.gameState.originalScript = {
                    script: this.script,
                    sceneId: this.currentSceneId,
                    gameState: { ...this.gameState }
                };
            }
            
            // 设置特殊剧本
            this.script = kawasakiScript;
            this.specialScript = kawasakiScript;
            this.gameState.specialScriptMode = true;
            this.gameState.specialUserType = 'kawasaki';
            
            // 直接跳转到场景12
            this.currentSceneId = 12;
            this.showCurrentScene();
            
            console.log('✅ 已跳转到场景12');
            console.log('📝 应该看到：');
            console.log('   - 合照背景（IMG_3350完全隐藏）');
            console.log('   - 黑瀬澄作为说话人');
            console.log('   - "真让人羡慕呢"的对话');
            console.log('👉 点击继续将返回初始界面');
        } catch (error) {
            console.error('❌ 加载失败:', error);
        }
    };
    
    // 演示完整川崎结局流程
    window.game.demoKawasakiEnding = function() {
        console.log('🎭 演示川崎结局流程');
        console.log('📋 流程说明：');
        console.log('1️⃣ 场景11：显示合照（无对话）');
        console.log('2️⃣ 场景12：黑瀬内心独白"真让人羡慕呢"（合照背景）');
        console.log('3️⃣ 场景13：点击返回初始界面');
        console.log('\n🚀 开始演示...');
        
        // 使用testKawasakiEnding开始
        this.testKawasakiEnding();
    };
    
    // 快速进入川崎剧情（从输入名字开始）
    window.game.quickKawasaki = function() {
        console.log('🚀 快速进入川崎剧情');
        
        // 模拟输入川崎蝾井的名字
        this.gameState.variables.player_name = '川崎蝾井';
        this.gameState.isSpecialUser = true;
        this.gameState.specialUserType = 'kawasaki';
        this.gameState.characterName = '川崎蝾井';
        this.gameState.characterId = 'kawasaki';
        this.gameState.kawasakiNeedSpecialScript = true;
        
        // 跳转到场景6（触发川崎剧情）
        this.currentSceneId = 6;
        this.showCurrentScene();
        
        console.log('✅ 已设置川崎身份');
        console.log('👉 点击对话框继续，将自动进入川崎特殊剧情');
    };
    
    // 添加剧本切换功能
    window.game.loadStory = function(scriptName) {
        this.loadNewScript(scriptName);
        console.log('📚 正在加载剧本:', scriptName);
    };
    
    window.game.loadTemplate = function() {
        this.loadNewScript('story_template.json');
        console.log('📖 加载完整故事模板！');
    };
    
    window.game.loadKuroseSumi = function() {
        this.loadNewScript('kurose_sumi_story.json');
        console.log('🧠 加载黒瀨澄心理诊疗故事！');
    };
});
