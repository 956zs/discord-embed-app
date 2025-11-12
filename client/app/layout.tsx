import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discord 伺服器統計",
  description: "Discord 伺服器統計與可視化",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="dark">
      <body>{children}</body>
    </html>
  );
}
