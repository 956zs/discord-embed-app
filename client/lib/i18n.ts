// 語言配置

export type Language = "zh-TW" | "zh-CN";

export const translations = {
  "zh-TW": {
    // 導航
    nav: {
      server: "伺服器概覽",
      messages: "訊息趨勢",
      channels: "頻道使用",
      members: "成員活躍度",
      emojis: "表情符號",
      admin: "管理員",
    },
    // 主頁
    home: {
      title: "Discord 伺服器統計",
      description: "查看伺服器的詳細統計資訊和活動分析",
      loading: "載入中...",
      loadingData: "正在獲取伺服器統計資料",
      timeRange: "時間範圍",
      days7: "最近 7 天",
      days30: "最近 30 天",
      days90: "最近 90 天",
      days180: "最近 180 天",
      days365: "最近一年",
      allTime: "所有時間",
    },
    // 統計卡片
    stats: {
      serverOverview: "伺服器概覽",
      memberCount: "成員數",
      channelCount: "頻道數",
      roleCount: "身分組數",
      messageTrends: "訊息趨勢",
      messageTrendsDesc: "的訊息量和活躍用戶統計",
      channelUsage: "頻道使用統計",
      channelUsageDesc: "各頻道的訊息數量",
      memberActivity: "成員活躍度",
      memberActivityDesc: "發言次數排行榜 Top 10",
      emojiStats: "表情符號統計",
      emojiStatsDesc: "最常使用的表情符號 Top 10",
      noData: "暫無資料",
      messages: "則訊息",
    },
    // 管理員頁面
    admin: {
      title: "管理員控制台",
      description: "歷史訊息提取與管理",
      backToHome: "返回主頁",
      batchFetch: "批量提取",
      channelList: "頻道列表",
      fetchHistory: "提取歷史",
      quickSelect: "快速選擇",
      needsUpdate: "需要更新的頻道",
      neverFetched: "尚未提取的頻道",
      allChannels: "全部頻道",
      clearSelection: "清除選擇",
      startFetch: "開始批量提取",
      selected: "已選擇",
      channels: "個頻道",
      threads: "個討論串",
    },
    // 通用
    common: {
      loading: "載入中",
      error: "錯誤",
      success: "成功",
      cancel: "取消",
      confirm: "確認",
      save: "儲存",
      delete: "刪除",
      edit: "編輯",
      close: "關閉",
    },
  },
  "zh-CN": {
    // 导航
    nav: {
      server: "服务器概览",
      messages: "消息趋势",
      channels: "频道使用",
      members: "成员活跃度",
      emojis: "表情符号",
      admin: "管理员",
    },
    // 主页
    home: {
      title: "Discord 服务器统计",
      description: "查看服务器的详细统计信息和活动分析",
      loading: "加载中...",
      loadingData: "正在获取服务器统计数据",
      timeRange: "时间范围",
      days7: "最近 7 天",
      days30: "最近 30 天",
      days90: "最近 90 天",
      days180: "最近 180 天",
      days365: "最近一年",
      allTime: "所有时间",
    },
    // 统计卡片
    stats: {
      serverOverview: "服务器概览",
      memberCount: "成员数",
      channelCount: "频道数",
      roleCount: "身份组数",
      messageTrends: "消息趋势",
      messageTrendsDesc: "的消息量和活跃用户统计",
      channelUsage: "频道使用统计",
      channelUsageDesc: "各频道的消息数量",
      memberActivity: "成员活跃度",
      memberActivityDesc: "发言次数排行榜 Top 10",
      emojiStats: "表情符号统计",
      emojiStatsDesc: "最常使用的表情符号 Top 10",
      noData: "暂无数据",
      messages: "条消息",
    },
    // 管理员页面
    admin: {
      title: "管理员控制台",
      description: "历史消息提取与管理",
      backToHome: "返回主页",
      batchFetch: "批量提取",
      channelList: "频道列表",
      fetchHistory: "提取历史",
      quickSelect: "快速选择",
      needsUpdate: "需要更新的频道",
      neverFetched: "尚未提取的频道",
      allChannels: "全部频道",
      clearSelection: "清除选择",
      startFetch: "开始批量提取",
      selected: "已选择",
      channels: "个频道",
      threads: "个讨论串",
    },
    // 通用
    common: {
      loading: "加载中",
      error: "错误",
      success: "成功",
      cancel: "取消",
      confirm: "确认",
      save: "保存",
      delete: "删除",
      edit: "编辑",
      close: "关闭",
    },
  },
};

export type TranslationKey = keyof typeof translations["zh-TW"];
