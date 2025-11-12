import { Users, Hash, Shield, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerStats } from "@/types";

interface ServerOverviewProps {
  stats: ServerStats | null;
}

function ServerOverview({ stats }: ServerOverviewProps) {
  if (!stats) return null;

  const statItems = [
    {
      icon: Users,
      label: "總成員數",
      value: stats.memberCount.toLocaleString(),
      color: "text-blue-500",
    },
    {
      icon: Hash,
      label: "頻道數量",
      value: stats.channelCount.toLocaleString(),
      color: "text-green-500",
    },
    {
      icon: Shield,
      label: "身分組數",
      value: stats.roleCount.toLocaleString(),
      color: "text-purple-500",
    },
    {
      icon: Calendar,
      label: "創建日期",
      value: new Date(stats.createdAt).toLocaleDateString("zh-TW"),
      color: "text-orange-500",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ServerOverview;
