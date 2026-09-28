# 南方祖記 Warlords of Takao

原創的六角格英雄戰棋。從(假想的)冰河時期開始,一群人跨海東來,最後成為馬卡道人——高雄人的始祖。

- **英雄 RPG 戰棋**:一格一位英雄;五項屬性、升級點數、各自的攻擊方式與技能形狀(弧斬、直線、爆炸、連鎖、衝撞……)
- **六大職業系以原住民族語命名**:Kapah 狂戰士、Inibs 薩滿、Vukid 德魯伊、Rikat 法師、Hanitu 靈語、Hanup 獵手(語源與來源見 [docs/NAMES.md](docs/NAMES.md))
- **第一景・跨海東來**:末次冰盛期,巴度、達努、比杜三人走過露出海面的台灣海峽——離岸、玄武岩之夜(澎湖)、寒祟古象
- **畫風致敬《魔法公主》**,美術全部由自架畫室生成(`scripts/art/gen-art.py`)
- 手機優先;三種難度(溫和可悔棋);自動存檔

舊版十關《南方祖記》(約七千年前、Phaser)保留在 `legacy/`,線上版在 `/WoT/legacy/`,之後會成為較後面的章節。

## 開發

```bash
npm install
npm run dev
npm test          # 單元測試(含舊版)
npm run build
BALANCE=1 N=20 npx vitest run src/game/__tests__/balance.test.ts   # 自動對打平衡
```

規則與設計:[docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)。舊版設計:[docs/LEGACY_GAME_DESIGN.md](docs/LEGACY_GAME_DESIGN.md)。

## License

MIT
