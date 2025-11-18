"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Smile,
  Hash,
  TrendingUp,
  Settings,
  Activity,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

interface DashboardNavProps {
  isAdmin?: boolean;
}

export function DashboardNav({ isAdmin = false }: DashboardNavProps) {
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  const statsItems = [
    {
      title: t.stats.serverOverview,
      href: "#server",
      description: t.stats.viewServerInfo,
      icon: BarChart3,
    },
    {
      title: t.stats.messageTrends,
      href: "#messages",
      description: t.stats.view7DayTrends,
      icon: TrendingUp,
    },
    {
      title: t.stats.channelUsage,
      href: "#channels",
      description: t.stats.viewChannelStats,
      icon: Hash,
    },
    {
      title: t.stats.memberActivity,
      href: "#members",
      description: t.stats.viewMemberRanking,
      icon: Users,
    },
    {
      title: t.stats.emojiStats,
      href: "#emojis",
      description: t.stats.viewEmojiUsage,
      icon: Smile,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <NavigationMenu viewport={isMobile}>
        <NavigationMenuList className="flex-wrap">
          {isAdmin && (
            <>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={`${navigationMenuTriggerStyle()} whitespace-nowrap`}
                >
                  <Link href="/admin">
                    <Settings className="mr-2 h-4 w-4" />
                    {t.nav.admin}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={`${navigationMenuTriggerStyle()} whitespace-nowrap`}
                >
                  <Link href="/admin/monitoring">
                    <Activity className="mr-2 h-4 w-4" />
                    {t.nav.monitoring}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </>
          )}

          <NavigationMenuItem>
            <NavigationMenuTrigger className="whitespace-nowrap">
              {t.nav.stats}
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid gap-3 p-4 w-[90vw] max-w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                {statsItems.map((item) => (
                  <ListItem
                    key={item.title}
                    title={item.title}
                    href={item.href}
                    icon={item.icon}
                  >
                    {item.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>

          <NavigationMenuItem className="hidden md:block">
            <NavigationMenuTrigger className="whitespace-nowrap">
              {t.nav.quickJump}
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[90vw] max-w-[300px] md:w-[300px] gap-3 p-4">
                <li>
                  <NavigationMenuLink asChild>
                    <Link
                      href="#server"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium leading-none whitespace-nowrap">
                        <BarChart3 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{t.nav.server}</span>
                      </div>
                    </Link>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Link
                      href="#messages"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium leading-none whitespace-nowrap">
                        <TrendingUp className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{t.nav.messages}</span>
                      </div>
                    </Link>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink asChild>
                    <Link
                      href="#members"
                      className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium leading-none whitespace-nowrap">
                        <Users className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{t.nav.members}</span>
                      </div>
                    </Link>
                  </NavigationMenuLink>
                </li>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}

function ListItem({
  title,
  children,
  href,
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          <div className="flex items-center gap-2 text-sm font-medium leading-none whitespace-nowrap">
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            <span className="truncate">{title}</span>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
