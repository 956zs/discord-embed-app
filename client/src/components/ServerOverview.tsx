import { ServerStats } from "../types";
import "./Card.css";

interface ServerOverviewProps {
  stats: ServerStats | null;
}

function ServerOverview({ stats }: ServerOverviewProps) {
  if (!stats) return null;

  return (
    <div className="card">
      <h2>🏠 伺服器概覽</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{stats.memberCount}</div>
          <div className="stat-label">總成員數</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.channelCount}</div>
          <div className="stat-label">頻道數量</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.roleCount}</div>
          <div className="stat-label">身分組數</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {new Date(stats.createdAt).toLocaleDateString("zh-TW")}
          </div>
          <div className="stat-label">創建日期</div>
        </div>
      </div>
    </div>
  );
}

export default ServerOverview;
