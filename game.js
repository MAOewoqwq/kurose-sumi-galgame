// Galgame引擎 - MVP版本
class SimpleGalgameEngine {
    constructor() {
        this.script = null;
        this.currentSceneId = 1;
        this.gameState = {
            progress: 1,
            choices: {},
            variables: {},
            affection: 0,
            freeChatMode: false
        };
        
        // API配置
        this.apiConfig = {
            endpoint: '/api/chat' // 使用本地API端点
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
        // 预加载所有角色立绘，减少切换时的卡顿
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
    
    checkSpecialName(name) {
        // 检查是否为特殊名字
        if (name === '佳佳' || name === '唐佳锦') {
            // 设置特殊回答标志
            this.gameState.isSpecialUser = true;
            this.gameState.specialUserType = 'jiajia';
            console.log('检测到特殊用户:', name);
        } else if (name === '小明') {
            this.gameState.isSpecialUser = true;
            this.gameState.specialUserType = 'xiaoming';
            console.log('检测到特殊用户:', name);
        } else {
            this.gameState.isSpecialUser = false;
            this.gameState.specialUserType = null;
        }
    }
    
    async callDeepSeekAPI(userMessage) {
        try {
            const response = await fetch(this.apiConfig.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage
                })
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            const data = await response.json();
            return data.reply;
            
        } catch (error) {
            console.error('API调用失败:', error);
            return '抱歉，我现在有些困惑...能再说一遍吗？';
        }
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
            }
        }
        return originalText;
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
            this.continueHint.textContent = '🎬 ' + (scene.title || '场景切换');
            this.hideChoices();
            this.hideInput();
        } else if (scene.type === 'narration') {
            this.continueHint.textContent = '📖 旁白';
            this.hideChoices();
            this.hideInput();
        } else if (scene.type === 'ending') {
            this.continueHint.textContent = '🏁 故事结束';
            this.hideChoices();
            this.hideInput();
        } else if (scene.type === 'free_chat') {
            this.continueHint.textContent = '💬 自由对话';
            this.gameState.freeChatMode = true;
            this.enableFreeChat();
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
            const characterDef = this.script.characters[scene.character];
            if (characterDef && characterDef.sprites && characterDef.sprites[scene.sprite]) {
                const spriteFile = characterDef.sprites[scene.sprite];
                this.updateCharacter(spriteFile, scene.position, scene.sprite);
            } else {
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
        // 移除所有背景类
        this.chatWindow.className = this.chatWindow.className.replace(/background-\d+|custom-background/g, '').trim();
        
        if (backgroundName) {
            // 检查是否在剧本的backgrounds定义中
            let actualBackgroundFile = backgroundName;
            if (this.script.backgrounds && this.script.backgrounds[backgroundName]) {
                actualBackgroundFile = this.script.backgrounds[backgroundName];
            }
            
            if (actualBackgroundFile.endsWith('.png') || actualBackgroundFile.endsWith('.PNG') || actualBackgroundFile.endsWith('.jpg') || actualBackgroundFile.endsWith('.JPG')) {
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
        
        // 设置图片源
        sprite.src = `assets/characters/${spriteFile}`;
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
                console.error('立绘加载失败:', spriteFile);
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
            sprite.src = '';
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
        
        let index = 0;
        const speed = 50; // 打字速度（毫秒）
        
        const typeWriter = () => {
            if (index < text.length) {
                this.dialogText.textContent += text.charAt(index);
                index++;
                this.typewriterTimeout = setTimeout(typeWriter, speed);
            }
        };
        
        typeWriter();
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
        this.currentSceneId = choice.next;
        this.showCurrentScene();
    }
    
    nextScene() {
        const currentScene = this.getCurrentScene();
        
        // 如果是选择场景或输入场景，不自动推进
        if (currentScene && (currentScene.type === 'choice' || currentScene.type === 'input')) {
            return;
        }
        
        // 严格按照剧本顺序推进
        let nextSceneId;
        if (currentScene && currentScene.next) {
            // 使用剧本中指定的下一个场景ID
            nextSceneId = currentScene.next;
        } else {
            // 默认递增到下一个场景
            nextSceneId = this.currentSceneId + 1;
        }
        
        // 检查下一个场景是否存在
        const nextScene = this.script.scenes.find(scene => scene.id === nextSceneId);
        if (!nextScene) {
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
    
    enableFreeChat() {
        // 启用底部输入框进行自由聊天
        const inputArea = document.querySelector('.input-area');
        const input = inputArea.querySelector('input');
        const button = inputArea.querySelector('button');
        
        // 启用输入框
        input.removeAttribute('readonly');
        input.placeholder = '和黒瀨澄聊天...';
        input.style.background = '#fff';
        
        // 移除之前的事件监听器
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        // 添加自由聊天事件监听器
        const handleFreeChatInput = async () => {
            const message = newInput.value.trim();
            if (!message) return;
            
            // 显示用户消息
            this.showUserMessage(message);
            newInput.value = '';
            newInput.disabled = true;
            newButton.disabled = true;
            newButton.textContent = '思考中...';
            
            // 调用API获取回复
            const response = await this.callDeepSeekAPI(message);
            
            // 显示AI回复
            this.showAIResponse(response);
            
            // 重新启用输入
            newInput.disabled = false;
            newButton.disabled = false;
            newButton.textContent = '发送';
            newInput.focus();
        };
        
        newButton.addEventListener('click', handleFreeChatInput);
        newInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleFreeChatInput();
            }
        });
        
        newInput.focus();
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
