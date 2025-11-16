// 預載入管理器 - 在背景預先載入常用數據

const CACHE_KEYS = {
  channels: (guildId: string) => `discord_channels_${guildId}`,
  channelsTree: (guildId: string) => `discord_channels_tree_${guildId}`,
  roles: (guildId: string) => `discord_roles_${guildId}`,
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 分鐘

interface CacheData<T> {
  data: T;
  timestamp: number;
}

// 檢查緩存是否有效
function isCacheValid(cacheKey: string): boolean {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return false;

    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp < CACHE_DURATION;
  } catch {
    return false;
  }
}

// 預載入頻道列表
async function preloadChannels(guildId: string) {
  const cacheKey = CACHE_KEYS.channels(guildId);
  
  // 如果緩存有效，不需要重新載入
  if (isCacheValid(cacheKey)) {
    console.log('✅ 頻道列表緩存仍然有效');
    return;
  }

  try {
    console.log('🔄 預載入頻道列表...');
    const response = await fetch(`/api/fetch/${guildId}/channels`);
    const data = await response.json();
    
    const textChannels = data.filter((ch: any) => ch.type === 0);
    
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data: textChannels, timestamp: Date.now() })
    );
    
    console.log(`✅ 已預載入 ${textChannels.length} 個頻道`);
  } catch (error) {
    console.error('❌ 預載入頻道失敗:', error);
  }
}

// 預載入身分組列表
async function preloadRoles(guildId: string) {
  const cacheKey = CACHE_KEYS.roles(guildId);
  
  // 如果緩存有效，不需要重新載入
  if (isCacheValid(cacheKey)) {
    console.log('✅ 身分組列表緩存仍然有效');
    return;
  }

  try {
    console.log('🔄 預載入身分組列表...');
    const response = await fetch(`/api/fetch/${guildId}/roles`);
    const data = await response.json();
    
    const filteredRoles = data.filter((role: any) => role.name !== '@everyone');
    
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data: filteredRoles, timestamp: Date.now() })
    );
    
    console.log(`✅ 已預載入 ${filteredRoles.length} 個身分組`);
  } catch (error) {
    console.error('❌ 預載入身分組失敗:', error);
  }
}

// 預載入頻道樹（含討論串）
async function preloadChannelTree(guildId: string) {
  const cacheKey = CACHE_KEYS.channelsTree(guildId);
  
  // 如果緩存有效，不需要重新載入
  if (isCacheValid(cacheKey)) {
    console.log('✅ 頻道樹緩存仍然有效');
    return;
  }

  try {
    console.log('🔄 預載入頻道樹（含討論串）...');
    const response = await fetch(`/api/history/${guildId}/channels?includeThreads=true`);
    const data = await response.json();
    
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data, timestamp: Date.now() })
    );
    
    console.log(`✅ 已預載入 ${data.length} 個頻道（含討論串）`);
  } catch (error) {
    console.error('❌ 預載入頻道樹失敗:', error);
  }
}

// 預載入所有管理員數據
export async function preloadAdminData(guildId: string) {
  console.log('🚀 開始預載入管理員數據...');
  
  // 並行載入所有數據
  await Promise.allSettled([
    preloadChannels(guildId),
    preloadRoles(guildId),
    preloadChannelTree(guildId),
  ]);
  
  console.log('✅ 預載入完成');
}

// 清除特定伺服器的緩存
export function clearGuildCache(guildId: string) {
  localStorage.removeItem(CACHE_KEYS.channels(guildId));
  localStorage.removeItem(CACHE_KEYS.channelsTree(guildId));
  localStorage.removeItem(CACHE_KEYS.roles(guildId));
  console.log('🗑️ 已清除伺服器緩存');
}

// 清除所有過期緩存
export function clearExpiredCache() {
  const keys = Object.keys(localStorage);
  let cleared = 0;
  
  keys.forEach(key => {
    if (key.startsWith('discord_')) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp >= CACHE_DURATION) {
            localStorage.removeItem(key);
            cleared++;
          }
        }
      } catch {
        // 損壞的緩存，直接刪除
        localStorage.removeItem(key);
        cleared++;
      }
    }
  });
  
  if (cleared > 0) {
    console.log(`🗑️ 已清除 ${cleared} 個過期緩存`);
  }
}
