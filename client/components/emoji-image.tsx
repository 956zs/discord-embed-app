"use client";

import { useState } from "react";

interface EmojiImageProps {
  url: string;
  name: string;
  fallback?: string;
  className?: string;
}

export function EmojiImage({
  url,
  name,
  fallback = "❓",
  className = "h-6 w-6",
}: EmojiImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (hasError) {
    // 如果圖片載入失敗，顯示後備 emoji 或文字
    return (
      <div
        className={`${className} flex items-center justify-center bg-muted rounded text-xs font-medium`}
        title={`${name} (圖片載入失敗)`}
      >
        {fallback}
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={`${className} animate-pulse bg-muted rounded`}
          aria-label="載入中"
        />
      )}
      <img
        src={url}
        alt={name}
        className={`${className} ${
          isLoading ? "hidden" : "block"
        } object-contain`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        loading="lazy"
        crossOrigin="anonymous"
      />
    </>
  );
}
