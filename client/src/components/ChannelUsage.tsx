import { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { ChannelUsage as ChannelUsageType } from "../types";
import "./Card.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface ChannelUsageProps {
  guildId: string | null;
}

function ChannelUsage({ guildId }: ChannelUsageProps) {
  const [data, setData] = useState<ChannelUsageType[] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!guildId) return;
      try {
        const response = await axios.get<ChannelUsageType[]>(
          `${API_URL}/api/stats/channels/${guildId}`
        );
        setData(response.data);
      } catch (error) {
        console.error("獲取頻道使用情況失敗:", error);
      }
    };

    fetchData();
  }, [guildId]);

  if (!data) return null;

  const chartData = {
    labels: data.map((c) => c.name),
    datasets: [
      {
        label: "訊息數量",
        data: data.map((c) => c.messageCount),
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
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
      <h2>💬 頻道使用情況</h2>
      <Bar data={chartData} options={options} />
    </div>
  );
}

export default ChannelUsage;
