# 部署到 Vercel 指南

## 步骤 1：登录 Vercel

在终端运行：
```bash
npx vercel login
```

这会：
1. 在终端显示几个登录选项（GitHub、GitLab、Bitbucket、Email）
2. 选择你喜欢的方式（推荐 GitHub）
3. 浏览器会自动打开进行授权
4. 授权成功后返回终端

## 步骤 2：部署项目

登录成功后，在项目目录运行：
```bash
npx vercel
```

会询问几个问题：
1. **Set up and deploy "~/Desktop/Sumi"?** → 输入 `Y`
2. **Which scope do you want to deploy to?** → 选择你的用户名
3. **Link to existing project?** → 输入 `N`（新项目）
4. **What's your project's name?** → 输入 `kurose-sumi-galgame` 或其他名字
5. **In which directory is your code located?** → 直接回车（当前目录）
6. **Want to override the settings?** → 输入 `N`

## 步骤 3：设置环境变量（可选）

如果要启用 AI 对话功能：
1. 访问 https://vercel.com/dashboard
2. 找到你的项目
3. 进入 Settings → Environment Variables
4. 添加：
   - Name: `DEEPSEEK_API_KEY`
   - Value: 你的 API Key
   - 保存

## 步骤 4：获取访问地址

部署成功后会显示：
```
✅ Production: https://kurose-sumi-galgame.vercel.app [copied to clipboard]
```

这就是你的公网地址！任何人都可以访问。

## 常用命令

```bash
# 查看部署状态
npx vercel ls

# 查看项目详情
npx vercel inspect [url]

# 重新部署
npx vercel --prod

# 查看日志
npx vercel logs [url]
```

## 注意事项

1. **首次部署**可能需要 1-2 分钟
2. **后续更新**：修改代码后运行 `npx vercel --prod` 即可更新
3. **自定义域名**：可以在 Vercel 控制台添加
4. **访问统计**：在 Vercel 控制台查看

## 故障排除

如果遇到问题：
1. 确保在项目根目录（有 vercel.json 的目录）
2. 检查网络连接
3. 尝试 `npx vercel --debug` 查看详细信息

祝部署成功！🚀