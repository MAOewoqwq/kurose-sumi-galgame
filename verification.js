// 验证脚本 - 检查黒瀨澄故事集成状态
console.log('🔍 验证黒瀨澄故事集成...');

// 检查剧本文件
fetch('kurose_sumi_story.json')
  .then(response => response.json())
  .then(script => {
    console.log('✅ 剧本加载成功:', script.title);
    console.log('📋 场景数量:', script.scenes.length);
    console.log('🎭 角色定义:', Object.keys(script.characters));
    
    // 检查立绘文件
    const sprites = script.characters.kurose.sprites;
    Object.entries(sprites).forEach(([emotion, filename]) => {
      const img = new Image();
      img.onload = () => console.log(`✅ 立绘文件存在: ${filename}`);
      img.onerror = () => console.log(`❌ 立绘文件缺失: ${filename}`);
      img.src = `assets/characters/${filename}`;
    });
    
    // 检查背景文件
    if (script.backgrounds.therapy_room) {
      const bgImg = new Image();
      bgImg.onload = () => console.log(`✅ 背景文件存在: ${script.backgrounds.therapy_room}`);
      bgImg.onerror = () => console.log(`❌ 背景文件缺失: ${script.backgrounds.therapy_room}`);
      bgImg.src = `assets/backgrounds/${script.backgrounds.therapy_room}`;
    }
  })
  .catch(error => {
    console.log('❌ 剧本加载失败:', error);
  });

console.log('🎮 打开浏览器访问: http://localhost:3000');
console.log('💡 或在浏览器控制台运行此脚本检查状态');