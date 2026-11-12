/**
 * 原说明书页对照数据。
 *
 * 用法：客户把说明书页图片放进 public/manual-pages/<slug>/，然后在这里登记
 * 每一步对应哪一页。index 是步骤下标（0 开始），null 表示这一步没有对应页。
 *
 * 例：
 *   "billy-80x202": {
 *     brand: "客户品牌",
 *     name: "两门书柜",
 *     stepPages: [
 *       { page: 6, src: "/manual-pages/billy-80x202/p06.png" },
 *       { page: 7, src: "/manual-pages/billy-80x202/p07.png" },
 *       null,
 *     ],
 *   }
 *
 * 注意：只登记客户自己拥有版权的页面。原厂说明书的图与文字不能进这个仓库。
 */

export type ManualPageRef = { page: number; src: string };

export type ManualEntry = {
  brand: string;
  name: string;
  /** 与 plan.steps 一一对应 */
  stepPages: (ManualPageRef | null)[];
};

export const manualPages: Record<string, ManualEntry> = {};

/**
 * 演示用占位页（自己画的示意图，不是任何厂商的说明书）。
 * 只有 NEXT_PUBLIC_MANUAL_DEMO=1 时才会出现，默认关闭。
 */
export const demoManual: ManualEntry = {
  brand: "示例",
  name: "示意用装配页",
  stepPages: [
    { page: 6, src: "/manual-pages/demo/p06.svg" },
    { page: 6, src: "/manual-pages/demo/p06.svg" },
    { page: 7, src: "/manual-pages/demo/p07.svg" },
    { page: 7, src: "/manual-pages/demo/p07.svg" },
    { page: 8, src: "/manual-pages/demo/p08.svg" },
    { page: 8, src: "/manual-pages/demo/p08.svg" },
  ],
};
