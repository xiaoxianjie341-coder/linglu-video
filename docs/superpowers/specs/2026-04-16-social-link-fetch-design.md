# 社媒链接抓取改造设计

**日期：** 2026-04-16
**状态：** 已确认并准备实施

## 目标

把当前 Web MVP 的 URL 读取层从单一的 `fetch + stripHtml` 改造成按域名分流的 provider 架构，解决 `X`、小红书和普通网页在抓取方式上的根本差异。

## 问题

当前实现位于 `lib/fetch-source.ts`，对所有 URL 都执行相同逻辑：

- 直接 `fetch(url)`
- 读取 HTML
- 用正则删除标签并返回文本

这个方案对动态站点和社媒页面会出现三类问题：

- 抓取失败时，真实错误被吞掉，只剩统一提示
- 对 SPA / 壳页面只能拿到导航、页脚、推荐流等噪音
- 对 `X`、小红书这类依赖登录态、令牌或特殊提取策略的平台不具备稳定性

## 方案

引入统一的 source provider 层，入口仍然保留在 `fetchSourceContent()`，但内部改为：

1. 解析输入 URL
2. 根据域名选择 provider
3. provider 返回结构化的抓取结果
4. 统一做文本清洗、空内容校验和错误映射

### Provider 划分

- `plain-web`：普通网页正文提取，使用 `defuddle` 处理 HTML 到主内容
- `x`：调用本机已有的 `baoyu-danger-x-to-markdown` skill 脚本，读取输出的 markdown 文件内容
- `xiaohongshu`：调用现成 `xhs` CLI 读取笔记内容，优先使用平台专用结果而不是网页壳页面

### 回退策略

- `X` provider 失败时，不回退到 naive HTML 提取，直接抛出明确错误
- 小红书 provider 失败时，不回退到 naive HTML 提取，直接提示需要有效链接或登录态
- 普通网页提取失败时，返回通用 URL 抓取失败提示

### 错误处理

新增 provider 级错误，保留原始错误原因，供日志和测试使用；对用户侧仍输出可读文案，但不再吞掉所有细节。

## 影响范围

- `lib/fetch-source.ts`
- 新增 `lib/source-providers/*`
- 新增或修改 `tests/lib/*`
- `package.json` 新增正文提取依赖

## 验证标准

- 普通网页：能提取到正文而不是整页噪音
- `X`：命中专用 provider，并能从 markdown 输出中拿到文本
- 小红书：命中专用 provider，并从 CLI 结果中提取正文
- 未支持域名：走普通网页 provider
- provider 失败：返回明确且可测试的错误
