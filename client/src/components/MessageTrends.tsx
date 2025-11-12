import { useState, useEffect } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { MessageTrend } from "../types";
import "./Card.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface MessageTrendsProps {
  guildId: string | null;
}

function MessageTrends({ guildId }: MessageTrendsProps) {
  const [data, setData] = useState<MessageTrend[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;
      try {
        const response = await axios.get<MessageTrend[]>(
          `${API_URL}/api/stats/messages/${guildId}`
        );
        setData(response.data);
      } catch (error) {
        console.error("獲取訊息趨勢失敗:", error);
      }
    };

    fetchData();
  }, [guildId]);

  if (!data) return null;

  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: "訊息數量",
        data: data.map((d) => d.messages),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        tension: 0.4,
      },
      {
        label: "活躍用戶",
        data: data.map((d) => d.activeUsers),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#fff" },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        ticks: { color: "#fff" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      x: {
        ticks: { color: "#fff" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
  };

  return (
    <div className="card">
      <h2>📈 訊息量趨勢</h2>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default MessageTrends;
