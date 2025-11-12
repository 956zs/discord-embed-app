import { useState, useEffect } from "react";
import axios from "axios";
import { Users, Trophy, Medal, Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MemberActivity as MemberActivityType } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface MemberActivityProps {
  guildId: string | null;
}

function MemberActivity({ guildId }: MemberActivityProps) {
  const [members, setMembers] = useState<MemberActivityType[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [guildId]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground">#{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            最活躍成員
          </CardTitle>
          <CardDescription>載入中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          最活躍成員
        </CardTitle>
        <CardDescription>根據訊息數量排名</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member, index) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(index)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{member.username}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.messageCount.toLocaleString()} 則訊息
                  </div>
                </div>
                <Badge variant="secondary">
                  {member.messageCount.toLocaleString()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default MemberActivity;
