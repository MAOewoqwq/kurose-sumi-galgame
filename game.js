// Galgame引擎 - MVP版本
class SimpleGalgameEngine {
    constructor() {
        this.script = null;
        this.currentSceneId = 1;
        this.gameState = {
            progress: 1,
            choices: {}
        };
        
        this.messageDisplay = document.getElementById('messageDisplay');
        this.speakerName = document.getElementById('speakerName');
        this.dialogText = document.getElementById('dialogText');
        this.continueHint = document.getElementById('continueHint');
        
        this.init();
    }
    
    async init() {
        try {
            await this.loadScript();
            this.setupEventListeners();
            this.showCurrentScene();
        } catch (error) {
            console.error('游戏初始化失败:', error);
            this.showError('游戏加载失败，请刷新页面重试。');
        }
    }
    
    async loadScript() {
        try {
            const response = await fetch('script.json');
            if (!response.ok) {
                throw new Error('剧本文件加载失败');
            }
            this.script = await response.json();
            console.log('剧本加载成功:', this.script.title);
        } catch (error) {
            console.error('剧本加载错误:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        // 点击消息区域推进对话
        this.messageDisplay.addEventListener('click', () => {
            this.nextScene();
        });
        
        // 键盘空格键推进对话
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.nextScene();
            }
        });
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
    }
    
    updateDisplay(scene) {
        // 更新角色名
        this.speakerName.textContent = scene.speaker || '系统';
        
        // 更新对话内容
        this.dialogText.textContent = scene.text || '';
        
        // 根据场景类型更新提示
        if (scene.type === 'choice') {
            this.continueHint.textContent = '💭 做出选择';
            this.showChoices(scene.choices);
        } else {
            this.continueHint.textContent = '💬 点击继续';
            this.hideChoices();
        }
        
        // 添加显示动画
        this.animateTextDisplay();
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
                this.selectChoice(choice.next);
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
    
    selectChoice(nextSceneId) {
        this.gameState.choices[this.currentSceneId] = nextSceneId;
        this.currentSceneId = nextSceneId;
        this.showCurrentScene();
    }
    
    nextScene() {
        const currentScene = this.getCurrentScene();
        
        // 如果是选择场景，不自动推进
        if (currentScene && currentScene.type === 'choice') {
            return;
        }
        
        // 推进到下一个场景
        this.currentSceneId++;
        
        // 如果没有更多场景，循环回到开始
        if (!this.getCurrentScene()) {
            this.currentSceneId = 1;
        }
        
        this.showCurrentScene();
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
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.choice-button {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border: 2px solid #c4a4ff;
    border-radius: 6px;
    padding: 10px 15px;
    font-size: 14px;
    font-family: 'K2D', Arial, sans-serif;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: left;
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
    console.log('💡 操作提示：');
    console.log('   - 点击对话框或按空格键继续');
    console.log('   - 遇到选择时点击选项按钮');
    console.log('   - game.saveGame() 手动保存');
    console.log('   - game.loadGame() 加载存档');
});