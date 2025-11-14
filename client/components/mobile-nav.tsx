"use client";

import * as React from "react";
import Link from "next/link";
import {
  Menu,
  Settings,
  BarChart3,
  TrendingUp,
  Hash,
  Users,
  Smile,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface MobileNavProps {
  isAdmin?: boolean;
}

export function MobileNav({ isAdmin = false }: MobileNavProps) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);

  const statsItems = [
    {
      title: t.stats.serverOverview,
      href: "#server",
      icon: BarChart3,
    },
    {
      title: t.stats.messageTrends,
      href: "#messages",
      icon: TrendingUp,
    },
    {
      title: t.stats.channelUsage,
      href: "#channels",
      icon: Hash,
    },
    {
      title: t.stats.memberActivity,
      href: "#members",
      icon: Users,
    },
    {
      title: t.stats.emojiStats,
      href: "#emojis",
      icon: Smile,
    },
  ];

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">打開菜單</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] pt-16">
        <SheetHeader>
          <SheetTitle>{t.nav.stats}</SheetTitle>
          <SheetDescription>快速跳轉到統計項目</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* 管理員按鈕 */}
          {isAdmin && (
            <>
              <Link
                href="/admin"
                onClick={handleLinkClick}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Settings className="h-5 w-5" />
                {t.nav.admin}
              </Link>
              <Separator />
            </>
          )}

          {/* 統計項目 */}
          <div className="space-y-1">
            {statsItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
