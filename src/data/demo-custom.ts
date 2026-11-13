import type { ProductSpec } from "@/lib/types";

/**
 * 中文示例产品：一款两门书柜，用来演示"中文手册 → 中文 3D 指南"的完整效果。
 * 数据是这个仓库自己编的，不含任何厂商的图纸或文案。
 */
export const DEMO_CUSTOM: ProductSpec = {
  slug: "demo-bookcase",
  name: "示例书柜",
  variant: "80 × 28 × 202 厘米",
  category: "书柜",
  archetype: "custom",
  size: { w: 80, h: 202, d: 28 },
  minutes: 45,
  people: 1,
  difficulty: 2,
  material: "刨花板 + 纤维背板",
  source: "catalog",
  tips: {},
  custom: {
    parts: [
      { id: "A", label: "1", name: "左侧板", size: [18, 2020, 280], pos: [-391, 1010, 0], material: "board" },
      { id: "B", label: "1", name: "右侧板", size: [18, 2020, 280], pos: [391, 1010, 0], material: "board" },
      { id: "C", label: "2", name: "顶板", size: [764, 18, 280], pos: [0, 2011, 0], material: "board" },
      { id: "D", label: "3", name: "底板", size: [764, 18, 280], pos: [0, 75, 0], material: "board" },
      { id: "E", label: "4", name: "中层固定隔板", size: [764, 18, 280], pos: [0, 720, 0], material: "board" },
      { id: "F", label: "5", name: "背板", size: [800, 2020, 3.5], pos: [0, 1010, -138], material: "fiber" },
      { id: "G", label: "6", name: "踢脚板", size: [764, 60, 18], pos: [0, 30, 131], material: "board" },
      { id: "H", label: "7", name: "可调搁板", size: [764, 18, 262], pos: [0, 980, 0], material: "board" },
    ],
    steps: [
      {
        title: "把木榫敲进四块横板",
        detail: "每块板四根, 敲到底, 不要外露。",
        fix: [{ kind: "dowel", count: 16, to: ["C", "D", "E", "G"] }],
        tools: ["hammer"],
        pose: "+y",
      },
      {
        title: "把偏心螺丝拧进两块侧板",
        detail: "每块 6 颗, 螺杆朝板内, 螺丝头朝外。",
        fix: [{ kind: "camScrew", count: 12, to: ["A", "B"] }],
        tools: ["screwdriver"],
        pose: "+z",
      },
      {
        title: "侧板扣到底板",
        detail: "对准底板两端的木榫, 垂直压到底, 开槽的一面朝内。",
        add: ["A", "B", "D", "G"],
        pose: "+y",
      },
      {
        title: "锁紧底板偏心轮",
        detail: "底板下面四个偏心轮, 各转 180 度。",
        fix: [{ kind: "cam", count: 4, to: ["D"] }],
        tools: ["screwdriver"],
        pose: "-y",
      },
      {
        title: "装上中层隔板",
        detail: "隔板两端落在侧板木榫上, 两侧各锁一个偏心轮。",
        add: ["E"],
        fix: [{ kind: "cam", count: 2, to: ["E"] }],
        tools: ["screwdriver"],
        pose: "+y",
      },
      {
        title: "盖上顶板",
        detail: "对准侧板顶端的木榫, 从上往下压到位。",
        add: ["C"],
        pose: "+y",
      },
      {
        title: "锁紧顶板偏心轮",
        detail: "顶板下面 6 个偏心轮, 逐个转 180 度。到这里框架就方正了。",
        fix: [{ kind: "cam", count: 6, to: ["C"] }],
        tools: ["screwdriver"],
        pose: "-y",
      },
      {
        title: "钉上背板",
        detail: "沿四边各钉几颗, 钉在板材边缘中线上, 别钉偏。",
        add: ["F"],
        fix: [{ kind: "nail", count: 18, to: ["F"] }],
        tools: ["hammer"],
        warnings: ["square"],
        pose: "-z",
      },
      {
        title: "放上可调搁板",
        detail: "层高按书的开本自己调, 同一层两边要一样高。",
        add: ["H"],
        pose: "+y",
      },
    ],
  },
};
