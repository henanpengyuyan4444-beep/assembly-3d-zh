# 本仓库的工作约定

这是 Bygga 的中文 fork。上游代码是 MIT，改动要能被上游看懂，也要方便客户接手。

- 不重写上游的装配计划生成（`src/lib/plan`）与渲染舞台（`src/engine`）。需要新能力时先看上游有没有现成实现。
- 中文只管"进"和"出"：中文手册的读入（`src/lib/scan/prompts.zh.ts`）、原页对照（`src/components/guide/ManualPage.tsx`）。界面文案的中文化单独排期，不要顺手改一半。
- 任何 IKEA 或其他厂商的说明书、图纸、照片都不能进这个仓库。演示用页只能是自己画的，并标注"示例"。
- 保留 `LICENSE` 与 `NOTICE` 里的上游版权与商标说明，不要删。
- JSON 数据里不要出现 BOM（Windows 的 PowerShell 写文件容易带 BOM，会让 Next 解析失败）。
- 改完必须跑：`npx tsc --noEmit` 和 `npm run lint`。
- 英文文案里不用长破折号，中文用普通标点。
