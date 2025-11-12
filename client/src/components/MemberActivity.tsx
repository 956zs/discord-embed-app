import { useState, useEffect } from "react";
import axios from "axios";
import { MemberActivity as MemberActivityType } from "../types";
import "./Card.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface MemberActivityProps {
  guildId: string | null;
}

function MemberActivity({ guildId }: MemberActivityProps) {
  const [members, setMembers] = useState<MemberActivityType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;
      try {
        const response = await axios.get<MemberActivityType[]>(
          `${API_URL}/api/stats/members/${guildId}`
        );
        setMembers(response.data);
      } catch (error) {
        console.error("獲取成員活躍度失敗:", error);
      }
    };

    fetchData();
  }, [guildId]);

  return (
    <div className="card">
      <h2>👥 最活躍成員</h2>
      <div className="member-list">
        {members.map((member, index) => (
          <div key={member.id} className="member-item">
            <div className="member-rank">#{index + 1}</div>
            <div className="member-info">
              <div className="member-name">{member.username}</div>
              <div className="member-stats">{member.messageCount} 則訊息</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MemberActivity;
