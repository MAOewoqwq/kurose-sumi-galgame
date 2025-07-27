export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, analyzeEmotion } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

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
- 适当使用"..."表现思考或害羞的停顿

${analyzeEmotion ? `【情感分析要求】
请在回复的最后，用[EMOTION_SCORE:X]的格式标注用户消息的情感倾向分数。
- X是-1到1之间的数字
- 正面情感（赞美、关心、爱意等）：0.5到1
- 中性情感：-0.5到0.5
- 负面情感（批评、冷漠、恶意等）：-1到-0.5
例如：你的话真温暖...[EMOTION_SCORE:0.8]` : ''}`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    let reply = data.choices[0].message.content;
    let emotionScore = null;

    // 如果请求了情感分析，解析分数
    if (analyzeEmotion) {
      const scoreMatch = reply.match(/\[EMOTION_SCORE:(-?\d+\.?\d*)\]/);
      if (scoreMatch) {
        emotionScore = parseFloat(scoreMatch[1]);
        // 移除分数标记，只返回纯对话
        reply = reply.replace(/\[EMOTION_SCORE:(-?\d+\.?\d*)\]/, '').trim();
      }
    }

    return res.status(200).json({ reply, emotionScore });

  } catch (error) {
    console.error('DeepSeek API error:', error);
    // 返回更详细的错误信息用于调试
    return res.status(500).json({ 
      reply: '抱歉，我现在有些困惑...能再说一遍吗？',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}