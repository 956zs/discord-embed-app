"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function AdminTestPage() {
  const [clickCount, setClickCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
    console.log(message);
  };

  const testButton1 = () => {
    addLog("✅ 測試按鈕 1 被點擊");
    setClickCount((prev) => prev + 1);
  };

  const testButton2 = async () => {
    addLog("✅ 測試按鈕 2 被點擊（異步）");
    await new Promise((resolve) => setTimeout(resolve, 1000));
    addLog("✅ 測試按鈕 2 完成");
  };

  const testAlert = () => {
    addLog("✅ 測試 alert");
    alert("這是一個測試 alert");
  };

  const testConfirm = () => {
    addLog("✅ 測試 confirm");
    const result = confirm("確定要繼續嗎？");
    addLog(`confirm 結果: ${result}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">管理員頁面測試</h1>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-2">點擊計數器</h2>
          <p className="text-2xl font-bold mb-4">{clickCount}</p>
          <Button onClick={testButton1}>測試按鈕 1</Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-2">異步測試</h2>
          <Button onClick={testButton2}>測試按鈕 2（異步）</Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-2">對話框測試</h2>
          <div className="space-x-2">
            <Button onClick={testAlert}>測試 Alert</Button>
            <Button onClick={testConfirm}>測試 Confirm</Button>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-2">日誌</h2>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">尚無日誌</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))
            )}
          </div>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => {
              setLogs([]);
              addLog("🗑️ 日誌已清除");
            }}
          >
            清除日誌
          </Button>
        </div>
      </div>

      <div className="p-4 bg-yellow-500/10 border border-yellow-500 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">說明</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>如果按鈕可以點擊，說明基本的 React 事件處理正常</li>
          <li>如果 console.log 有輸出，說明日誌系統正常</li>
          <li>如果 alert/confirm 可以彈出，說明對話框正常</li>
          <li>請打開 F12 開發者工具查看 console 輸出</li>
        </ul>
      </div>

      <Button
        variant="outline"
        onClick={() => (window.location.href = "/admin")}
      >
        返回管理員頁面
      </Button>
    </div>
  );
}
