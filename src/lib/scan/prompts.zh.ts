/**
 * 中文手册用的提示词（fork 新增）。
 * 输出的 JSON 结构与英文版完全一致，这样 plan 解析器不用改。
 * 打开方式：设置 SCAN_LANG=zh 后重启服务。
 */

export const PAGE_PROMPT_ZH = `你在读一张产品装配说明书的照片。产品可能是家具, 也可能是任何需要组装的东西, 品牌不限。只输出 JSON, 不要多于一个字。

{
  "kind": "cover" | "parts" | "hardware" | "tools" | "steps" | "warnings" | "other",
  "product": { "name": "", "brand": "", "type": "", "size": "" },
  "parts": [{ "label": "1", "name": "侧板", "qty": 2, "size": "60 x 30 x 1.8 厘米", "notes": "" }],
  "hardware": [{ "label": "A", "kind": "dowel", "qty": 8, "size": "8 x 30 毫米" }],
  "tools": ["十字螺丝刀"],
  "steps": [{ "n": 3, "shows": "这一页的图在干什么, 用一两句白话", "parts": ["1", "2"], "hardware": [{ "label": "A", "qty": 4 }], "people": 1, "orientation": "upright | upside down | lying on its back | face down | on its side" }],
  "warnings": ["需要两个人"]
}

规则:
- 只写你在这一页上真正看到的东西, 看不清的字段直接省略。
- 一张纸上常常画了同一个产品的几个视角。同一块板在几个视角里出现, 只算一块, 不要重复列。
- 画在一起的两块板, 不要按左右拆成两条; 除非图上明确是两块分开的板。
- 五金 kind 取值: dowel, cam bolt, cam lock, screw, nail, shelf pin, bolt, leg bolt, hinge, knob, handle, wall bracket, felt pad, plate, other。
- 写步骤时要说清零件放在哪: 上面, 下面, 左边, 右边, 前面, 后面, 以及哪两块挨着。
- 图上有尺寸线或数字就照着读, 换算成厘米或毫米写进 size。
- 如果这张照片是包装盒或成品图, 用 kind "cover", 并在 product.type 里用一句话描述外形, 例如"两格书柜, 约 70 厘米宽"。`;

export const PLAN_PROMPT_ZH = `你把一份装配说明书整理成可以驱动 3D 分步演示的数据。输入是按页码顺序读到的每页笔记, 可能还有人输入的名字。

只输出 JSON, 不要多余文字:
{
  "name": "LOOP",
  "brand": "客户品牌",
  "variant": "唱片架",
  "category": "电视柜",
  "size": { "w": 70, "h": 66, "d": 40 },
  "minutes": 35,
  "people": 1,
  "difficulty": 2,
  "archetype": "shelf",
  "fromCover": false,
  "parts": [ { "id": "A", "label": "1", "name": "侧板", "size": [18, 660, 400], "pos": [-341, 330, 0], "shape": "box", "material": "board" } ],
  "steps": [ { "title": "把木榫敲进一块侧板", "detail": "平放, 孔朝上。", "add": [], "fix": [ { "kind": "dowel", "count": 4, "to": ["A"] } ], "tools": ["hammer"], "people": 1, "pose": "upright", "warnings": ["floor"] } ],
  "watchOut": ["这款产品最常见的一个错法。"]
}

字段:
- name 用包装上的名字, brand 写品牌, variant 一句话说清是什么, size 是成品外廓尺寸, 单位厘米。
- difficulty 取 1, 2, 3。只有真需要第二个人才写 people: 2。
- archetype 取最接近的一个: shelf, drawers, table, bed, cabinet, seat, sofa。它只是兜底。

几何, 这段最重要:
- 单位是毫米。
- 一块板一条记录, 两块一样的侧板要写两条, id 不同, label 相同。
- 说明书同一页画了多个视角: 同一块板只写一条。不要因为画在左右两边就当成两块板, 也不要凭空补出第三块侧板。
- size 写 [宽, 高, 深], 指这块板在成品里的尺寸。侧板 18 厚, 660 高, 400 深, 就是 [18, 660, 400]。顶板写在两块侧板之间, 宽 664 就是 [664, 18, 400]。
- pos 写这块板在成品里的中心点。y 是离地高度, x 是从正面看的左右, z 从后往前(向后为负)。产品在 x 和 z 上都居中, 立在 y 等于 0 的地面上。
- 相接的两块必须面对面贴合, 不能有缝也不能重叠。每块都要算一遍: 侧板 18 厚, 站在 x 等于 -341 和 341, 内表面在 -332 和 332, 夹在中间的顶板就是 664 宽。
- 腿, 横撑, 木条, 圆杆也按方块写, 圆的用 "shape": "cyl"。
- material 取 board(刨花板, 中纤板, 多层板), fiber(薄背板, 抽屉底板), wood(实木, 腿, 木条), metal, soft(软包, 床垫)。
- 不写五金和包装。零件最多 60 条, 重复的木条最多 12 条。

步骤:
- 顺序跟着说明书原顺序。title 是一条短指令, 不超过 30 个汉字; detail 一到两句。
- add 写这一步接上去的零件 id, 每块板只能出现一次, 出现它第一次被用到的步骤。
- fix 写这一步用到的五金和数量。kind 取: dowel, camScrew, cam, screw, nail, pin, bolt, legScrew, hinge, knob, handle, bracket, glide, plate。说明书说清装进哪块板时, 用 to 写上 id。
- pose 写这一步产品怎么放: upright, upside_down, on_back, face_down, on_left_side, on_right_side。
- tools 取: allen, screwdriver, flathead, hammer, drill, wrench, level, tape, pencil, knife。
- warnings 取: two(需要两人), floor(在软垫上操作), loose(先别拧死), hand(手拧), wall(要固定到墙), tip(可能倾倒), square(检查方正), face(注意正面朝向)。
- 一般 6 到 20 步。

名字只写手册上真正印着的: 看不到产品名就留空字符串, 品牌看不到就留空。示例里的 LOOP 和 Acme 只是格式样例, 不要照抄。
如果只拿到封面或成品图, 就按这种产品的常规做法补一套合理的零件与步骤, 并把 "fromCover" 设为 true。

示例, 一个小床头柜:
{"name":"KUBO","brand":"Acme","variant":"床头柜","category":"床头柜","size":{"w":40,"h":50,"d":35},"minutes":25,"people":1,"difficulty":1,"archetype":"cabinet",
"parts":[{"id":"A","label":"1","name":"侧板","size":[16,500,350],"pos":[-192,250,0]},{"id":"B","label":"1","name":"侧板","size":[16,500,350],"pos":[192,250,0]},{"id":"C","label":"2","name":"顶板","size":[368,16,350],"pos":[0,492,0]},{"id":"D","label":"3","name":"底板","size":[368,16,350],"pos":[0,58,0]},{"id":"E","label":"4","name":"背板","size":[396,496,3],"pos":[0,252,-176.5],"material":"fiber"}],
"steps":[{"title":"把木榫敲进顶板和底板","fix":[{"kind":"dowel","count":8,"to":["C","D"]}],"tools":["hammer"]},
{"title":"把顶板和底板装到一块侧板上","add":["A","C","D"],"fix":[{"kind":"camScrew","count":4}],"pose":"on_back"},
{"title":"锁紧偏心轮","fix":[{"kind":"cam","count":4}],"tools":["screwdriver"],"pose":"on_back"},
{"title":"装上另一块侧板","add":["B"],"fix":[{"kind":"camScrew","count":4},{"kind":"cam","count":4}],"tools":["screwdriver"],"pose":"on_back"},
{"title":"钉上背板","detail":"从四个角开始。","add":["E"],"fix":[{"kind":"nail","count":12}],"tools":["hammer"],"pose":"face_down","warnings":["square"]},
{"title":"立起来","pose":"upright"}]}
顶板 368 宽, 正好卡在两块侧板内表面 -184 和 184 之间; 背板贴在侧板背面上, 后面在 z 等于 -175。`;
