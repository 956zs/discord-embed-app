import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Smile,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ServerOverview from "./ServerOverview";
import MessageTrends from "./MessageTrends";
import ChannelUsage from "./ChannelUsage";
import MemberActivity from "./MemberActivity";
import EmojiStats from "./EmojiStats";
import { ServerStats } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface DashboardProps {
  guildId: string | null;
}

type ViewType = "trends" | "channels" | "members" | "emojis";

function Dashboard({ guildId }: DashboardProps) {
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>("trends");

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
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-[400px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[80px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case "trends":
        return <MessageTrends guildId={guildId} />;
      case "channels":
        return <ChannelUsage guildId={guildId} />;
      case "members":
        return <MemberActivity guildId={guildId} />;
      case "emojis":
        return <EmojiStats guildId={guildId} />;
      default:
        return <MessageTrends guildId={guildId} />;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          {serverStats?.name || "伺服器"} 統計儀表板
        </h1>
        <p className="text-muted-foreground">即時監控伺服器活動與成員互動</p>
      </div>

      {/* Overview */}
      <ServerOverview stats={serverStats} />

      {/* Navigation Menu */}
      <div className="space-y-4">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <button
                onClick={() => setActiveView("trends")}
                className={navigationMenuTriggerStyle()}
                data-active={activeView === "trends"}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                訊息趨勢
              </button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <button
                onClick={() => setActiveView("channels")}
                className={navigationMenuTriggerStyle()}
                data-active={activeView === "channels"}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                頻道使用
              </button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <button
                onClick={() => setActiveView("members")}
                className={navigationMenuTriggerStyle()}
                data-active={activeView === "members"}
              >
                <Users className="h-4 w-4 mr-2" />
                成員活躍度
              </button>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <button
                onClick={() => setActiveView("emojis")}
                className={navigationMenuTriggerStyle()}
                data-active={activeView === "emojis"}
              >
                <Smile className="h-4 w-4 mr-2" />
                表情統計
              </button>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Content */}
        <div className="mt-6">{renderContent()}</div>
      </div>
    </div>
  );
}

export default Dashboard;
