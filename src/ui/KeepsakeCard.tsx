/** 信物卡:插圖、名字、由來,與三個配戴位置各自的效果 */
import { getKeepsake, SLOTS } from "../game/keepsakes";
import type { SlotId } from "../game/types";
import { keepsakeArt } from "./assets";

export function KeepsakeCard({ id, highlight, compact }: { id: string; highlight?: SlotId; compact?: boolean }) {
  const k = getKeepsake(id);
  return (
    <div className="keepsake-card">
      <img className="keepsake-art" src={keepsakeArt(k.id)} alt={k.name} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: compact ? 16 : 20 }}>{k.name}</div>
        {!compact && <div style={{ fontSize: 13.5, lineHeight: 1.7, margin: "2px 0 6px" }}>{k.lore}</div>}
        <div className="grid" style={{ gap: 3 }}>
          {SLOTS.map((s) => (
            <div key={s.id} className={`slot-line ${highlight === s.id ? "on" : ""} ${highlight && highlight !== s.id ? "off" : ""}`}>
              <b>
                {s.name}・{s.realm}
              </b>
              <span>{k.effects[s.id].desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
