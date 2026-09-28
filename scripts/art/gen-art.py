#!/usr/bin/env python3
"""用自架 Qwen-Image「畫室」生成 WoT 美術(致敬《魔法公主》的手繪動畫風)→ public/art/**.webp

用法:~/rembg-venv/bin/python scripts/art/gen-art.py [類別或關鍵字…]   不給就全部;已存在的檔案跳過(刪掉就重畫)
畫室只在家用 tailnet 內(http://qwen-image:8189)。原圖另存 scripts/art/raw/(不進版控)。

- 立繪:先畫有背景的半身像 → 畫室以圖改圖換純白背景 → rembg(isnet-anime)去背 → 收邊
- 小人:直接畫白底 Q 版全身 → 去背 → 收邊
- 地形:俯視 tile;大圖:16:9 劇情背景
提示詞原則:只用正面描述(否定句的東西會被畫出來);內容在前、風格在後。
"""
import base64, io, json, sys, time, urllib.request
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
RAW = Path(__file__).resolve().parent / "raw"
ART = ROOT / "public" / "art"
API = "http://qwen-image:8189"

STYLE = "。宮崎駿《魔法公主》風格的手繪日本動畫電影畫面,吉卜力工作室的賽璐璐上色與水彩背景,柔和自然的大地色,清爽的線條,高品質"
PORTRAIT = "半身肖像,背景是冰雪覆蓋的針葉林與灰白天空"
CHIBI = "Q版二頭身的可愛小人,全身站姿,側身朝向畫面右方,腳踏地面,整個角色完整在畫面中央,輪廓清楚。"
WHITE = "。乾淨的純白色背景"
TILE = ",從正上方垂直俯視的地面紋理,均勻鋪滿整個畫面,手繪水彩質感,柔和的冬日色調"

# 角色設定:三人來自大陸東南沿海,名字取自原始南島語重建詞(Blust & Trussel ACD)
HEROES = {
    "batu": "冰河時期的少年狂戰士巴度,十五歲,黝黑的皮膚,蓬亂的黑髮綁著皮繩,臉頰上塗著紅色赭土戰紋,披著灰色狼皮與鹿皮衣,手握綁著皮繩的大石斧,眼神倔強",
    "danum": "冰河時期的少女薩滿達努,十六歲,溫柔堅定的眼神,黑色長髮編成細辮、綴著白色貝殼與鹿骨,額頭有藍色點紋,身穿鹿皮衣與羽毛披肩,手持掛著骨鈴的鹿角杖",
    "bitu": "冰河時期的少年法師比杜,十二歲,瘦小安靜,烏黑的短髮,大而明亮的眼睛,臉上有白色星點紋,披著深藍色的獸皮斗篷,手握頂端鑲著黑曜石的木杖,杖尖閃著星光",
}
BEASTS = {
    "grayfang": "巨大的冰河時期斑鬣狗首領「灰牙」,灰黃色毛皮上布滿斑點,肩上有舊傷疤,低頭齜牙,眼睛發著冷光",
    "tiger": "巨大的冰河時期雪紋虎,蓬鬆的淡金色冬毛與深色條紋,琥珀色的眼睛,威嚴而沉默",
    "elephant": "被寒祟附身的古菱齒象神,比山還高的遠古巨象,彎長的象牙,身上爬滿冰晶與蠕動的黑色觸手,一隻眼睛發著青白色的光,痛苦而憤怒",
}

SPECS = {
    **{f"portraits/{k}": ("3:4", v + ",臉朝向畫面右方。" + PORTRAIT + STYLE) for k, v in HEROES.items()},
    **{f"portraits/{k}": ("3:4", v + ",頭朝向畫面左方。胸像特寫,背景是風雪中的凍原" + STYLE) for k, v in BEASTS.items()},
    # ── 戰場小人 ──
    "sprites/batu": ("1:1", CHIBI + "少年狂戰士,蓬亂黑髮綁皮繩,臉頰紅色戰紋,灰色狼皮披肩,雙手舉著大石斧" + STYLE + WHITE),
    "sprites/danum": ("1:1", CHIBI + "少女薩滿,黑色細辮綴著白貝殼,羽毛披肩與鹿皮衣,手持掛骨鈴的鹿角杖" + STYLE + WHITE),
    "sprites/bitu": ("1:1", CHIBI + "少年法師,烏黑短髮,臉上白色星點紋,深藍色獸皮斗篷,舉著頂端發光的黑曜石木杖" + STYLE + WHITE),
    "sprites/hyena": ("1:1", "Q版的可愛冰河時期斑鬣狗,全身側面朝向畫面右方,四腳站立,灰黃色斑點毛皮,整隻完整在畫面中央" + STYLE + WHITE),
    "sprites/grayfang": ("1:1", "Q版的冰河時期斑鬣狗首領,體型壯碩,肩上有傷疤,齜牙低吼,全身側面朝向畫面右方,整隻完整在畫面中央" + STYLE + WHITE),
    "sprites/tiger": ("1:1", "Q版的冰河時期雪紋虎,蓬鬆淡金色冬毛與深色條紋,全身側面朝向畫面右方,四腳站立,整隻完整在畫面中央" + STYLE + WHITE),
    "sprites/wisp": ("1:1", "Q版的寒祟小妖靈,由青白色冰晶與蠕動的黑色觸手糾結成的一團,中間有一隻發光的眼睛,整隻完整在畫面中央" + STYLE + WHITE),
    "sprites/elephant": ("1:1", "Q版的古菱齒象神,長長的彎曲象牙,身上爬著冰晶與黑色觸手,全身側面朝向畫面右方,整隻完整在畫面中央" + STYLE + WHITE),
    "sprites/totem": ("1:1", "一根小小的薩滿圖騰柱,木頭雕刻著鹿與鳥的臉,掛著羽毛與骨鈴,柱頂飄著淡藍色的靈光,整根完整在畫面中央" + STYLE + WHITE),
    # ── 信物 1:1(白底去背) ──
    "keepsakes/hyena-head": ("1:1", "用皮繩串起來的小護符:一顆磨得光滑的小鬣狗頭骨,眼窩裡塞著紅色赭土,綁著幾顆小貝殼與羽毛。一件精緻的小物件靜物特寫,置中,完整呈現,柔和的光" + STYLE + WHITE),
    "keepsakes/basalt-shard": ("1:1", "一片黑色玄武岩石片,形狀是正六邊形(像蜂巢的一格,剛好六條邊、六個角),表面有細細的紋理,中心透出一點溫暖的橘色微光,穿著皮繩。一件精緻的小物件靜物特寫,置中,完整呈現,柔和的光" + STYLE + WHITE),
    "keepsakes/elephant-blessing": ("1:1", "一小片乳白色的象牙護符,上面有一圈一圈像年輪與漣漪的紋路,散發淡淡的青綠色靈光,穿著編織的草繩。一件精緻的小物件靜物特寫,置中,完整呈現,柔和的光" + STYLE + WHITE),
    "keepsakes/frost-crystal": ("1:1", "一顆透明晶瑩、淡青藍色的尖銳冰晶結晶體,像水晶一樣有稜角與反光,內部封著一縷黑色的煙霧與一個發光的小眼睛,表面凝結著白霜,頂端綁在皮繩上。一件精緻的小物件靜物特寫,置中,完整呈現,柔和的光" + STYLE + WHITE),
    "keepsakes/tiger-claw": ("1:1", "一根單獨的、彎曲尖銳的大型老虎爪甲(像彎月形的尖鉤),象牙白到淡黃色,根部纏著皮繩與幾撮淡金色的虎毛,爪尖有一道舊裂痕。一件精緻的小物件靜物特寫,置中,完整呈現,柔和的光" + STYLE + WHITE),
    # ── 勝利插圖 16:9 ──
    "story/win-shore": ("16:9", "打退鬣狗群之後的清晨海灘,三位身穿獸皮與鹿皮衣的史前少年少女(披狼皮的黑髮狂戰士少年,烏黑髮辮綴著白貝殼的薩滿少女,披深藍獸皮斗篷的黑髮小法師)坐在海邊的岩石上喘口氣,狂戰士少年的手心裡托著一個用皮繩綁著的小小獸骨護符,另外兩人湊過來看,陽光穿過晨霧,遠處海浪" + STYLE),
    "story/win-basalt": ("16:9", "黎明時分的黑色玄武岩六角石柱台地,營火剩下餘燼,三位身穿獸皮與鹿皮衣的史前少年少女(披狼皮的黑髮狂戰士少年,烏黑髮辮綴著白貝殼的薩滿少女,披深藍獸皮斗篷的黑髮小法師)站在台地邊緣看著東方的第一道陽光,小法師手中捧著一片發光的六角石片" + STYLE),
    "story/win-blight": ("16:9", "霧散去的冰原上,一頭巨大的古菱齒象神恢復了溫和的眼神,低下頭用長鼻輕觸一位烏黑髮辮綴著白貝殼的薩滿少女的額頭,少女身後是披狼皮的狂戰士少年與披深藍斗篷的小法師,空中飄著化成雪花的黑色觸手" + STYLE),
    # ── 地形 ──
    "terrain/tundra": ("1:1", "冬天的凍原草地,枯黃的短草與薄薄的殘雪" + TILE),
    "terrain/snow": ("1:1", "厚厚的積雪地面,雪面有風吹的紋路與淡藍陰影" + TILE),
    "terrain/ice": ("1:1", "結冰的湖面,透明的淡藍色冰層與白色裂紋" + TILE),
    "terrain/basalt": ("1:1", "黑色玄武岩台地的頂面,六角形石柱的斷面排成蜂巢狀,縫隙有殘雪與苔蘚" + TILE),
    "terrain/taiga": ("1:1", "積雪的針葉林樹冠,深綠色的杉樹頂擠滿畫面,枝上有白雪" + TILE),
    "terrain/shallows": ("1:1", "淺藍綠色的淺水,清澈的水面下隱約可見圓石,水面有漣漪與零星的薄冰" + TILE),
    "terrain/sea": ("1:1", "冰冷的深藍色海水,水面有細小波紋與浮冰碎片" + TILE),
    "terrain/rocks": ("1:1", "雜亂的大石塊堆,灰色岩石上有積雪" + TILE),
    "terrain/campfire": ("1:1", "雪地上一圈石頭圍著的營火,橘紅色的火焰與木柴,周圍的雪被烤化成泥地" + TILE),
    "terrain/marsh": ("1:1", "結了薄冰的沼澤,枯黃的蘆葦叢與黑色泥水" + TILE),
    # ── 劇情大圖 16:9 ──
    "story/title": ("16:9", "史詩主視覺:冰河時期,三位身穿獸皮的史前少年少女的背影走在冰雪覆蓋的廣闊陸橋上——左邊是蓬亂黑髮、披灰色狼皮、扛著石斧的狂戰士少年,中間是烏黑長髮編成細辮綴著白貝殼、披羽毛披肩、拿鹿角杖的薩滿少女,右邊是黑色短髮、披深藍色獸皮斗篷、握著黑曜石杖的小法師——遠方海霧中是金色晨光照亮的高聳青色山脈" + STYLE),
    "story/map": ("16:9", "從高空俯瞰的冰河時期地形全景,像一幅手繪的古地圖:畫面左側是大陸的海岸與丘陵,中央是一大片露出海面的草原陸橋,陸橋中間有幾座黑色的玄武岩台地,草原陸橋一路向右延伸、直接連接到畫面右側南北狹長、山脈高聳的翠綠大陸塊,陸地從左到右完全相連沒有被海隔開,只有畫面上緣與下緣是藍色的海,地面上有細小的鹿群與河流,淡淡的霧" + STYLE),
    "story/coast": ("16:9", "黎明的大陸海岸,海水退去後露出的寬廣泥灘與凍原,遠方霧中有鬣狗群的剪影,三位身穿獸皮與鹿皮衣的史前少年少女(手持石斧、披狼皮的狂戰士少年,拿鹿角杖、烏黑髮辮綴著白貝殼的黑髮薩滿少女,披深藍獸皮斗篷、握黑曜石杖的小法師)並肩站在岩石上遠望東方" + STYLE),
    "story/penghu": ("16:9", "夜晚的玄武岩台地,黑色六角石柱斷崖,台地上一堆營火,滿天星斗,遠處凍原上有發光的野獸眼睛" + STYLE),
    "story/blight": ("16:9", "濃霧中的冰原,一頭比山還高的古菱齒象神被冰晶與蠕動的黑色觸手纏繞,痛苦地仰天長嘯,地面結滿青白色的冰" + STYLE),
    "story/sunrise": ("16:9", "日出時分,三位少年少女站在海岸的丘陵上,眺望眼前一座被金色陽光照亮的翠綠高山島嶼,雲海與森林,充滿希望" + STYLE),
    "story/victory": ("16:9", "雪原上的篝火旁,三位身穿獸皮與鹿皮衣的史前少年少女(手持石斧、披狼皮的狂戰士少年,拿鹿角杖、烏黑髮辮綴著白貝殼的黑髮薩滿少女,披深藍獸皮斗篷、握黑曜石杖的小法師)圍坐休息,溫暖的火光,天邊泛起晨光" + STYLE),
    "story/defeat": ("16:9", "暴風雪中,三位身穿獸皮與鹿皮衣的史前少年少女(手持石斧、披狼皮的狂戰士少年,拿鹿角杖、烏黑髮辮綴著白貝殼的黑髮薩滿少女,披深藍獸皮斗篷、握黑曜石杖的小法師)互相攙扶著撤退,背後是模糊的野獸剪影,冷藍色調" + STYLE),
}

SIZES = {"portraits": (600, 800), "sprites": (256, 256), "keepsakes": (256, 256), "terrain": (256, 256), "story": (1280, 720)}
_session = None


def api(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def job(body):
    j = api("/api/jobs", body)
    while j["status"] not in ("done", "error", "failed"):
        time.sleep(3)
        j = api(f"/api/jobs/{j['id']}")
    if j["status"] != "done":
        raise RuntimeError(j.get("error"))
    with urllib.request.urlopen(API + j["image_url"], timeout=180) as r:
        return r.read()


def cutout(data: bytes) -> Image.Image:
    global _session
    from rembg import new_session, remove
    _session = _session or new_session("isnet-anime")
    im = remove(Image.open(io.BytesIO(data)).convert("RGB"), session=_session)
    im = im.crop(im.getbbox())
    # 收邊:alpha 往內收並壓暗邊緣,去掉白底光暈
    r, g, b, a = im.split()
    a2 = a.filter(ImageFilter.MinFilter(3))
    edge = ImageChops.subtract(a, a2)
    rgb = Image.merge("RGB", (r, g, b))
    rgb = Image.composite(rgb.point(lambda v: int(v * 0.55)), rgb, edge)
    return Image.merge("RGBA", (*rgb.split(), a2.filter(ImageFilter.GaussianBlur(0.6))))


def main():
    want = sys.argv[1:]
    RAW.mkdir(parents=True, exist_ok=True)
    for key, (ratio, prompt) in SPECS.items():
        if want and not any(w in key for w in want):
            continue
        kind = key.split("/")[0]
        out = ART / f"{key}.webp"
        if out.exists():
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        raw = RAW / f"{key.replace('/', '_')}.png"
        if not raw.exists():
            raw.write_bytes(job({"prompt": prompt, "mode": "int8", "size": ratio}))
        if kind == "portraits":
            white = RAW / f"white_{out.stem}.png"
            if not white.exists():
                white.write_bytes(job({
                    "prompt": "把背景換成乾淨的純白色,角色的臉、髮型、服裝、武器、姿勢與構圖完全保持不變,角色周圍沒有任何背景物件",
                    "mode": "int8", "size": "auto",
                    "images": ["data:image/png;base64," + base64.b64encode(raw.read_bytes()).decode()],
                }))
            im = cutout(white.read_bytes())
            im.thumbnail((600, 900), Image.LANCZOS)
            im.save(out, "WEBP", quality=85, method=6)
        elif kind in ("sprites", "keepsakes"):
            im = cutout(raw.read_bytes())
            im.thumbnail((256, 256), Image.LANCZOS)
            im.save(out, "WEBP", quality=85, method=6)
        else:
            im = Image.open(raw).convert("RGB").resize(SIZES[kind], Image.LANCZOS)
            im.save(out, "WEBP", quality=82, method=6)
        print(key, out.stat().st_size // 1024, "KB", flush=True)


if __name__ == "__main__":
    main()
