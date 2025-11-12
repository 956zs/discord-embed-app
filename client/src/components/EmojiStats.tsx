import { useState, useEffect } from "react";
import axios from "axios";
import { EmojiUsage } from "../types";
import "./Card.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface EmojiStatsProps {
  guildId: string | null;
}

type FilterType = "all" | "custom" | "unicode";

function EmojiStats({ guildId }: EmojiStatsProps) {
  const [emojis, setEmojis] = useState<EmojiUsage[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;
      try {
        const response = await axios.get<EmojiUsage[]>(
          `${API_URL}/api/stats/emojis/${guildId}`
        );
        setEmojis(response.data);
      } catch (error) {
        console.error("獲取表情使用統計失敗:", error);
      }
    };

    fetchData();
  }, [guildId]);

  const filteredEmojis = emojis.filter((emoji) => {
    if (filter === "custom") return emoji.isCustom;
    if (filter === "unicode") return !emoji.isCustom;
    return true;
  });

  return (
    <div className="card">
      <h2>😀 表情使用排行</h2>
      <div className="emoji-filters">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          全部
        </button>
        <button
          className={filter === "custom" ? "active" : ""}
          onClick={() => setFilter("custom")}
        >
          自訂表情
        </button>
        <button
          className={filter === "unicode" ? "active" : ""}
          onClick={() => setFilter("unicode")}
        >
          Unicode
        </button>
      </div>
      <div className="emoji-list">
        {filteredEmojis.map((emoji, index) => (
          <div key={`${emoji.emoji}-${index}`} className="emoji-item">
            <div className="emoji-rank">#{index + 1}</div>
            <div className="emoji-display">
              {emoji.isCustom && emoji.url ? (
                <img
                  src={emoji.url}
                  alt={emoji.name}
                  className="custom-emoji"
                />
              ) : (
                <span className="unicode-emoji">{emoji.emoji}</span>
              )}
            </div>
            <div className="emoji-info">
              <div className="emoji-name">{emoji.name}</div>
              <div className="emoji-count">{emoji.count} 次</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EmojiStats;
