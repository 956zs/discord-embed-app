"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "zh-TW" ? "zh-CN" : "zh-TW");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1 md:gap-2 px-2 md:px-3"
      title={language === "zh-TW" ? "切換到簡體中文" : "切换到繁体中文"}
    >
      <Languages className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs md:text-sm">
        {language === "zh-TW" ? "繁" : "简"}
      </span>
    </Button>
  );
}
