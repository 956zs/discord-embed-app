import { useState, useEffect } from "react";
import axios from "axios";
import ServerOverview from "./ServerOverview";
import MessageTrends from "./MessageTrends";
import ChannelUsage from "./ChannelUsage";
import MemberActivity from "./MemberActivity";
import EmojiStats from "./EmojiStats";
import KeywordCloud from "./KeywordCloud";
import { ServerStats } from "../types";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface DashboardProps {
  guildId: string | null;
}

function Dashboard({ guildId }: DashboardProps) {
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;

      try {
        const response = await axios.get<ServerStats>(
          `${API_URL}/api/stats/server/${guildId}`
        );
        setServerStats(response.data);
      } catch (error) {
        console.error("獲取數據失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  if (loading) {
    return <div className="loading">載入統計數據中...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>📊 {serverStats?.name || "伺服器"} 統計儀表板</h1>
        <p>即時監控伺服器活動與成員互動</p>
      </header>

      <div className="dashboard-grid">
        <ServerOverview stats={serverStats} />
        <MessageTrends guildId={guildId} />
        <ChannelUsage guildId={guildId} />
        <MemberActivity guildId={guildId} />
        <EmojiStats guildId={guildId} />
        {/* <KeywordCloud guildId={guildId} /> */}
      </div>
    </div>
  );
}

export default Dashboard;
