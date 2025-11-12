"use client";

import { User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";

interface UserInfoProps {
  username?: string | null;
  userId?: string | null;
  isAdmin?: boolean;
}

export function UserInfo({ username, userId, isAdmin }: UserInfoProps) {
  if (!username && !userId) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Hi, {username || "User"}
            </span>
            {isAdmin && (
              <Badge variant="default" className="text-xs">
                管理員
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-xs font-medium">用戶資訊</p>
            <p className="text-xs text-muted-foreground">
              ID: {userId || "未知"}
            </p>
            {isAdmin && <p className="text-xs text-green-600">✓ 管理員權限</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
