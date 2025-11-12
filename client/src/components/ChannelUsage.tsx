import { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { MessageSquare } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChannelUsage as ChannelUsageType } from "@/types";

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
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            頻道使用情況
          </CardTitle>
          <CardDescription>載入中...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const chartData = {
    labels: data.map((c) => c.name),
    datasets: [
      {
        label: "訊息數量",
        data: data.map((c) => c.messageCount),
        backgroundColor: "rgba(168, 85, 247, 0.6)",
        borderColor: "rgba(168, 85, 247, 1)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          頻道使用情況
        </CardTitle>
        <CardDescription>各頻道的訊息數量統計</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

export default ChannelUsage;
