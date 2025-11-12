export interface ServerStats {
  name: string;
  memberCount: number;
  channelCount: number;
  roleCount: number;
  createdAt: string;
}

export interface MessageTrend {
  date: string;
  messages: number;
  activeUsers: number;
}

export interface ChannelUsage {
  id: string;
  name: string;
  messageCount: number;
  type: number;
}

export interface MemberActivity {
  id: string;
  username: string;
  messageCount: number;
  lastActive: string;
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

export interface AdminUser {
  user_id: string;
  username: string;
  granted_by: string;
  granted_at: string;
}

export interface HistoryTask {
  id: number;
  guild_id: string;
  channel_id: string;
  channel_name: string;
  status: "pending" | "running" | "completed" | "failed" | "warning";
  anchor_message_id: string | null;
  start_message_id: string | null;
  end_message_id: string | null;
  messages_fetched: number;
  messages_saved: number;
  messages_duplicate: number;
  error_message: string | null;
  started_by: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface FetchRange {
  id: number;
  guild_id: string;
  channel_id: string;
  start_message_id: string;
  end_message_id: string;
  start_timestamp: string;
  end_timestamp: string;
  message_count: number;
  task_id: number;
  created_at: string;
  task_status?: string;
  channel_name?: string;
}

export interface ChannelFetchStats {
  channel_id: string;
  channel_name: string;
  total_tasks: number;
  total_messages: number;
  last_fetch_time: string | null;
  last_success_time: string | null;
  completed_tasks: number;
  failed_tasks: number;
  warning_tasks: number;
  running_tasks: number;
}

export interface FetchSummary {
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  warning_tasks: number;
  running_tasks: number;
  pending_tasks: number;
  total_messages_fetched: number;
  total_messages_saved: number;
  total_messages_duplicate: number;
  channels_processed: number;
  last_fetch_time: string | null;
}
