# 血月之约 · Blood Moon Pact

一款用纯 HTML5 Canvas 制作的单机动作闯关 Demo：女吸血鬼卡蜜拉闯入血月下的绿色古堡，营救人类公主莉莉安。

**在线试玩**：<https://mimika9937-glitch.github.io/BloodMoonPact/>
（需要键盘 + 桌面版 Chrome / Edge；手机暂不支持）

## 操作

| 按键 | 功能 |
|---|---|
| A / D | 移动 |
| 空格 | 跳跃（二段跳） |
| J | 爪击连段（命中吸血） |
| K | 冲刺（可穿过攻击） |
| L | 血爆（范围爆发） |
| I | 血月（大范围高伤） |
| F | 格挡 / 弹反 |
| W | 交互（祭坛、开门） |
| S | 下跳（薄桥） |
| Tab | 背包 |
| Esc | 暂停 |
| M | 静音 |

## 内容

- 教学区 + 线性关卡 + 两阶段 Boss（人形 / 恶魔真身）
- 血量即资源：爪击吸血、三个耗血技能、格挡与弹反
- 收集：3 段公主记忆 + 2 件遗物 + 隐藏发饰；血币用于修复记忆
- 四结局：坏 / 普通 / 幸福 / 真结局
- 图鉴：9 张 CG 与 4 个结局回看，未收集项显示「???」
- 结算：用时、击杀数、死亡次数、S / A / B 评级

## 技术说明

- 纯 HTML5 Canvas 2D，无框架、无构建步骤；直接双击 `index.html` 也可离线运行
- 音频使用 `HTMLAudioElement`（规避 `file://` 下 Web Audio 解码限制），首次点击后播放
- 图鉴收集与静音设置保存在浏览器 `localStorage`

## 素材授权

- BGM：[SubspaceAudio / Juhani Junkala](https://opengameart.org/content/5-chiptunes-action)（CC0）
- 音效：[Kenney](https://kenney.nl/)（CC0）+ 本项目脚本合成
- CG 与立绘：AI 生成后二次处理

---

`使用说明.txt` 为可直接转发的玩家版说明。
