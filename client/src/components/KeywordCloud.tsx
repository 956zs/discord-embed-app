import { useState, useEffect } from "react";
import axios from "axios";
import ReactWordcloud from "react-wordcloud";
import { WordCloudData } from "../types";
import "./Card.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface KeywordCloudProps {
  guildId: string | null;
}

function KeywordCloud({ guildId }: KeywordCloudProps) {
  const [words, setWords] = useState<WordCloudData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;
      try {
        const response = await axios.get<WordCloudData[]>(
          `${API_URL}/api/stats/keywords/${guildId}`
        );
        setWords(response.data);
      } catch (error) {
        console.error("獲取關鍵詞雲失敗:", error);
      }
    };

    fetchData();
  }, [guildId]);

  const options = {
    rotations: 2,
    rotationAngles: [0, 90] as [number, number],
    fontSizes: [20, 80] as [number, number],
    colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"],
    enableTooltip: true,
    deterministic: false,
    fontFamily: "impact",
    fontStyle: "normal",
    fontWeight: "normal",
    padding: 2,
    scale: "sqrt" as const,
    spiral: "archimedean" as const,
  };

  return (
    <div className="card">
      <h2>☁️ 常見關鍵詞雲</h2>
      <div className="wordcloud-container">
        {words.length > 0 ? (
          <ReactWordcloud words={words} options={options} />
        ) : (
          <div className="no-data">暫無數據</div>
        )}
      </div>
    </div>
  );
}

export default KeywordCloud;
