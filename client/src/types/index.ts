export interface ServerStats {
  name: string;
  memberCount: number;
  channelCount: number;
  roleCount: number;
  createdAt: string;
}

export interface MemberActivity {
  id: string;
  username: string;
  messageCount: number;
  lastActive: string;
}

export interface ChannelUsage {
  id: string;
  name: string;
  messageCount: number;
  type: number;
}

export interface MessageTrend {
  date: string;
  messages: number;
  activeUsers: number;
}

export interface EmojiUsage {
  emoji: string;
  name: string;
  count: number;
  isCustom: boolean;
  url?: string;
}

export interface WordCloudData {
  text: string;
  value: number;
}
