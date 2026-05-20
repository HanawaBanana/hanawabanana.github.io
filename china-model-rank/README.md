# 中国大模型榜单

中国厂商大模型公开榜单。前台面向自然搜索用户，优先展示模型/公司、排名、能力分、口碑分和综合评分；评分来源保留外部评测、官方价格与真实用户原文链接。

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma + PostgreSQL schema
- Vitest
- 可替换平台采集 adapter 框架
- 富内容口碑爬虫：帖子/视频简介、前十热评、前三楼中楼、AI/启发式口碑评分

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

页面默认读取 `lib/data.ts` 的 seed 数据，因此没有数据库也能启动前台。连接 PostgreSQL 后可执行：

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## Scripts

- `npm run dev`: 启动本地开发服务器。
- `npm run build`: 构建生产版本。
- `npm run build:pages`: 按 GitHub Pages 项目页路径构建静态站，输出到 `out/`。
- `npm run test`: 运行评分和采集归一化测试。
- `npm run reputation:update`: 执行每日口碑采集，优先 API，失败后生成浏览器 MCP 待采任务。
- `npm run crawl:browser`: 使用本机可见 Chrome 做低频浏览器补源，适合需要人工登录的平台。
- `npm run crawl:reputation`: 富内容口碑爬虫，抓帖子标题/正文或视频简介、前十热评、前三楼中楼，并写入口碑数据。
- `npm run crawl:reputation:daily`: 每日富内容口碑更新，默认覆盖知乎、小红书、抖音、微博、虎扑、贴吧、B站，但会按缺口和频率限额裁剪目标。

## Rich Reputation Crawler

富内容爬虫优先走公开 API：B站和虎扑已有专用 adapter。知乎、小红书、微博、抖音、贴吧使用 Playwright 可见浏览器和 `.auth/rich-reputation` 持久登录态；默认随机等待 45-120 秒、每个关键词最多 3 个内容页，避免高频访问。

常用命令：

```bash
npm run crawl:reputation -- --platform bilibili --model deepseek-r1 --keyword "DeepSeek R1 使用感受"
npm run crawl:reputation -- --platform hupu --model qwen-max --keyword "通义千问 实际使用"
npm run crawl:reputation -- --daily --limit-targets 8
RICH_CRAWL_PLATFORMS=zhihu,xiaohongshu RICH_CRAWL_MAX_TARGETS=2 npm run crawl:reputation
```

常用环境变量：

- `RICH_CRAWL_PLATFORMS`: 平台列表，支持 `zhihu,xiaohongshu,douyin,weibo,hupu,tieba,bilibili`。
- `RICH_CRAWL_MAX_TARGETS`: 单次最多搜索目标数。
- `RICH_CRAWL_MAX_POSTS_PER_KEYWORD`: 每个关键词最多打开的内容页数，默认 3。
- `RICH_CRAWL_MIN_DELAY_MS` / `RICH_CRAWL_MAX_DELAY_MS`: 浏览器页面间随机等待，默认 45-120 秒。
- `RICH_CRAWL_HEADLESS=1`: 无头浏览器。默认可见浏览器，便于人工处理登录/验证。
- `LLM_SCORE_ENDPOINT` / `LLM_SCORE_API_KEY` / `LLM_SCORE_MODEL`: 可选 LLM 评分接口；未配置时使用本地启发式评分。

输出文件：

- `data/reputation-excerpts.json`: 前台读取的口碑摘录，包含来源、原文链接和平台正向标识。
- `data/crawler/latest-run.json`: 最近一次富爬虫报告。
- `data/crawler/action-required.json`: 登录、滑块、验证码、频控等需要人工接入的平台目标。
- `data/crawler/latest-posts.json`: 最近抓到的富帖子结构，便于复查热评和楼中楼。

## Browser Crawling

`npm run crawl:browser` 默认使用 `.auth/browser-reputation` 保存本地浏览器登录态，不提交账号、密码或 cookie。默认策略是低频模式：只跑虎扑、每次最多 3 个搜索目标、每个目标最多 2 个内容页，页面间随机等待 20-55 秒。

常用覆盖参数：

```bash
BROWSER_CRAWL_PLATFORMS=zhihu BROWSER_CRAWL_MAX_TARGETS_PER_RUN=1 npm run crawl:browser
BROWSER_CRAWL_PLATFORMS=xiaohongshu BROWSER_CRAWL_MIN_DELAY_MS=45000 BROWSER_CRAWL_MAX_DELAY_MS=120000 npm run crawl:browser
```

如果平台要求登录或验证，在打开的 Chrome 里手动完成后让脚本继续。不要并行运行多个浏览器采集任务。

## Compliance Boundary

- 登录态仅保存在本机 `.auth/`，不入库、不提交。
- 不绕过反爬。
- 不全文转载。
- 前台只展示摘要、统计和来源链接。
- 每日更新先筛选公开短摘录、来源链接和平台正向指标，再写入榜单数据。

## GitHub Pages 发布

项目已配置 Next.js 静态导出，GitHub Actions 会把 `out/` 发布到 Pages。

仓库设置：

1. 进入 GitHub 仓库 `Settings -> Pages`。
2. `Source` 选择 `GitHub Actions`。
3. 推送到 `main` 分支后运行仓库根目录的 `.github/workflows/deploy-pages.yml`。

默认项目页地址：

```bash
https://page.far-domain.top/china-model-rank
```

如果仓库名或用户名不同，发布前修改这两个环境变量：

```bash
NEXT_PUBLIC_BASE_PATH=/你的仓库名
NEXT_PUBLIC_SITE_URL=https://你的用户名.github.io/你的仓库名
npm run build
```

如果绑定自定义域名，使用空 basePath：

```bash
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_SITE_URL=https://你的域名
npm run build
```

GitHub Pages 是静态托管，不运行本项目内的 API。自然流量统计需要接入外部统计端点，并在构建时设置：

```bash
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://你的统计服务/pageview
```

站点已接入 GA4，默认 Measurement ID：

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-W80TF1WPB4
```
