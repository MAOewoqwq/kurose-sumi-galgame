const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 模拟DeepSeek API的本地回复函数
function generateLocalReply(message) {
    const responses = [
        "嗯...我在想这个问题。你能详细说说你的想法吗？",
        "从心理学角度来看，这确实是个有趣的观点...",
        "我能感受到你的情感。让我们一起分析一下这种感受。",
        "作为心理分析师，我觉得每个人的想法都很重要。",
        "...这让我想起了一些心理学理论。你觉得呢？",
        "嗯，我理解你的感受。有时候，内心的想法确实很复杂。",
        "从你的话中，我能感受到一些特别的情绪。"
    ];
    
    // 简单的情感分析
    if (message.includes('狛枝') || message.includes('凪斗')) {
        return "狛枝同学...他是个很特别的人呢。虽然他总是贬低自己，但我觉得他内心深处其实很渴望被理解。";
    }
    
    if (message.includes('开心') || message.includes('高兴')) {
        return "看到你这么开心，我也很高兴呢...能够分享快乐的感觉真好。";
    }
    
    if (message.includes('难过') || message.includes('伤心')) {
        return "我能感受到你的难过...如果你愿意的话，可以和我分享更多吗？";
    }
    
    return responses[Math.floor(Math.random() * responses.length)];
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API端点处理
    if (pathname === '/api/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const reply = generateLocalReply(data.message);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply }));
                console.log(`📝 本地API回复: ${data.message} -> ${reply}`);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // 静态文件服务
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    // 安全检查
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        // 设置正确的Content-Type
        const ext = path.extname(filePath);
        const contentTypes = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg'
        };

        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
    });
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`🚀 本地开发服务器启动在: http://localhost:${PORT}`);
    console.log(`📡 API端点: http://localhost:${PORT}/api/chat`);
    console.log(`💡 这个服务器包含完整的API支持，可以处理聊天请求`);
});