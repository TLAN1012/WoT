import { useState } from "react";
import { audio } from "../audio/audio";

export function MuteButton() {
  const [muted, setMuted] = useState(audio.muted);
  return (
    <button className="btn btn-sm btn-ghost btn-icon" onClick={() => setMuted(audio.toggleMute())} title={muted ? "開啟聲音" : "靜音"}>
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
