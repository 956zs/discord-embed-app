// 歷史訊息提取處理器
const { saveMessage, saveEmojiUsage } = require("./messageHandler");

class HistoryFetcher {
  constructor(pool, client) {
    this.pool = pool;
    this.client = client;
    this.activeTasks = new Map(); // taskId -> { status, progress, controller }
  }

  // 檢查用戶是否為管理員
  async isAdmin(guildId, userId) {
    try {
      const result = await this.pool.query(
        "SELECT 1 FROM admin_users WHERE guild_id = $1 AND user_id = $2",
        [guildId, userId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error("❌ 檢查管理員權限失敗:", error);
      return false;
    }
  }

  // 添加管理員
  async addAdmin(guildId, userId, username, grantedBy) {
    try {
      await this.pool.query(
        `INSERT INTO admin_users (guild_id, user_id, username, granted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, user_id) DO NOTHING`,
        [guildId, userId, username, grantedBy]
      );
      return true;
    } catch (error) {
      console.error("❌ 添加管理員失敗:", error);
      return false;
    }
  }

  // 創建提取任務
  async createTask(
    guildId,
    channelId,
    channelName,
    anchorMessageId,
    startedBy
  ) {
    try {
      const result = await this.pool.query(
        `INSERT INTO history_fetch_tasks 
         (guild_id, channel_id, channel_name, anchor_message_id, started_by, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id`,
        [guildId, channelId, channelName, anchorMessageId, startedBy]
      );
      return result.rows[0].id;
    } catch (error) {
      console.error("❌ 創建提取任務失敗:", error);
      throw error;
    }
  }

  // 更新任務狀態
  async updateTaskStatus(taskId, status, updates = {}) {
    try {
      const fields = ["status = $2"];
      const values = [taskId, status];
      let paramIndex = 3;

      if (updates.startedAt) {
        fields.push(`started_at = $${paramIndex++}`);
        values.push(updates.startedAt);
      }
      if (updates.completedAt) {
        fields.push(`completed_at = $${paramIndex++}`);
        values.push(updates.completedAt);
      }
      if (updates.messagesFetched !== undefined) {
        fields.push(`messages_fetched = $${paramIndex++}`);
        values.push(updates.messagesFetched);
      }
      if (updates.messagesSaved !== undefined) {
        fields.push(`messages_saved = $${paramIndex++}`);
        values.push(updates.messagesSaved);
      }
      if (updates.messagesDuplicate !== undefined) {
        fields.push(`messages_duplicate = $${paramIndex++}`);
        values.push(updates.messagesDuplicate);
      }
      if (updates.startMessageId) {
        fields.push(`start_message_id = $${paramIndex++}`);
        values.push(updates.startMessageId);
      }
      if (updates.endMessageId) {
        fields.push(`end_message_id = $${paramIndex++}`);
        values.push(updates.endMessageId);
      }
      if (updates.errorMessage) {
        fields.push(`error_message = $${paramIndex++}`);
        values.push(updates.errorMessage);
      }

      await this.pool.query(
        `UPDATE history_fetch_tasks SET ${fields.join(", ")} WHERE id = $1`,
        values
      );
    } catch (error) {
      console.error("❌ 更新任務狀態失敗:", error);
    }
  }

  // 檢查範圍重疊
  async checkRangeOverlap(guildId, channelId, startTs, endTs) {
    try {
      const result = await this.pool.query(
        `SELECT * FROM check_range_overlap($1, $2, $3, $4)`,
        [guildId, channelId, startTs, endTs]
      );
      return result.rows[0];
    } catch (error) {
      console.error("❌ 檢查範圍重疊失敗:", error);
      return { overlap_count: 0, overlapping_ranges: null };
    }
  }

  // 記錄提取範圍
  async recordFetchRange(
    guildId,
    channelId,
    startMsgId,
    endMsgId,
    startTs,
    endTs,
    messageCount,
    taskId
  ) {
    try {
      await this.pool.query(
        `INSERT INTO history_fetch_ranges 
         (guild_id, channel_id, start_message_id, end_message_id, start_timestamp, end_timestamp, message_count, task_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          guildId,
          channelId,
          startMsgId,
          endMsgId,
          startTs,
          endTs,
          messageCount,
          taskId,
        ]
      );
    } catch (error) {
      console.error("❌ 記錄提取範圍失敗:", error);
    }
  }

  // 提取單個批次的訊息
  async fetchBatch(channel, options) {
    try {
      const messages = await channel.messages.fetch(options);
      return messages;
    } catch (error) {
      console.error("❌ 提取批次失敗:", error);
      throw error;
    }
  }

  // 主要提取邏輯
  async startFetch(taskId, guildId, channelId, anchorMessageId) {
    const startTime = new Date();
    let messagesFetched = 0;
    let messagesSaved = 0;
    let messagesDuplicate = 0;
    let oldestMessageId = null;
    let newestMessageId = null;
    let oldestTimestamp = null;
    let newestTimestamp = null;

    try {
      // 更新任務為運行中
      await this.updateTaskStatus(taskId, "running", { startedAt: startTime });

      // 獲取伺服器
      let guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        console.log(`   ⚠️ 伺服器不在 cache 中，嘗試 fetch...`);
        try {
          guild = await this.client.guilds.fetch(guildId);
          console.log(`   ✅ 成功 fetch 伺服器: ${guild.name}`);
        } catch (error) {
          console.error(`   ❌ 無法 fetch 伺服器:`, error);
          throw new Error(`找不到伺服器 ${guildId}: ${error.message}`);
        }
      }

      // 驗證 guild 對象
      if (!guild || !guild.channels) {
        throw new Error(`伺服器對象無效: ${guildId}`);
      }

      // 獲取頻道
      let channel = guild.channels.cache.get(channelId);
      if (!channel) {
        console.log(`   ⚠️ 頻道不在 cache 中，嘗試 fetch...`);
        try {
          channel = await guild.channels.fetch(channelId);
          if (channel) {
            console.log(
              `   ✅ 成功 fetch 頻道: ${channel.name} (類型: ${channel.type})`
            );
          }
        } catch (error) {
          console.error(`   ❌ 無法 fetch 頻道:`, error);
          throw new Error(`找不到頻道 ${channelId}: ${error.message}`);
        }
      }

      // 驗證 channel 對象
      if (!channel) {
        throw new Error(
          `無法獲取頻道 ${channelId}（可能已被刪除或 bot 無權限訪問）`
        );
      }

      // 檢查是否為論壇頻道（類型 15）
      if (channel.type === 15) {
        console.log(`📋 檢測到論壇頻道: ${channel.name}`);
        console.log(`   論壇頻道需要提取其底下的討論串，而不是頻道本身`);

        // 獲取論壇頻道的所有活躍討論串
        try {
          const threads = await channel.threads.fetchActive();
          const archivedThreads = await channel.threads.fetchArchived();

          const allThreads = [
            ...threads.threads.values(),
            ...archivedThreads.threads.values(),
          ];

          console.log(`   找到 ${allThreads.length} 個討論串`);

          if (allThreads.length === 0) {
            throw new Error(`論壇頻道 ${channel.name} 沒有討論串可提取`);
          }

          // 提取所有討論串的訊息
          let totalMessages = 0;
          for (const thread of allThreads) {
            console.log(`   📝 提取討論串: ${thread.name}`);
            try {
              const threadMessages = await this.fetchMessagesFromChannel(
                thread,
                guild,
                taskId,
                anchorMessageId
              );
              totalMessages += threadMessages;
            } catch (error) {
              console.error(
                `   ❌ 討論串 ${thread.name} 提取失敗:`,
                error.message
              );
            }
          }

          console.log(
            `✅ 論壇頻道 ${channel.name} 提取完成，共 ${totalMessages} 條訊息`
          );

          // 更新任務狀態
          await this.db.query(
            `UPDATE fetch_history 
             SET status = 'completed', 
                 messages_fetched = $1,
                 completed_at = NOW(),
                 error_message = NULL
             WHERE id = $2`,
            [totalMessages, taskId]
          );

          return totalMessages;
        } catch (error) {
          console.error(`❌ 論壇頻道處理失敗:`, error);
          throw error;
        }
      }

      if (!channel.messages) {
        throw new Error(
          `頻道 ${channel.name} 不支援訊息操作（類型: ${channel.type}）`
        );
      }

      console.log(`📥 開始提取歷史訊息: ${guild.name} > #${channel.name}`);

      // 如果 anchorMessageId 是 "latest"，獲取最新訊息
      if (anchorMessageId === "latest") {
        console.log(`   獲取最新訊息作為錨點...`);
        try {
          if (
            !channel.messages ||
            typeof channel.messages.fetch !== "function"
          ) {
            throw new Error(`頻道 ${channel.name} 的 messages 對象無效`);
          }
          const latestMessages = await channel.messages.fetch({ limit: 1 });
          if (latestMessages.size > 0) {
            anchorMessageId = latestMessages.first().id;
            console.log(`   ✅ 錨點訊息 ID: ${anchorMessageId}`);
          } else {
            console.log(`   ⚠️ 頻道沒有訊息，跳過提取`);
            await this.updateTaskStatus(taskId, "completed", {
              completedAt: new Date(),
              messagesFetched: 0,
              messagesSaved: 0,
              messagesDuplicate: 0,
            });
            return {
              success: true,
              messagesFetched: 0,
              messagesSaved: 0,
              messagesDuplicate: 0,
              status: "completed",
            };
          }
        } catch (fetchError) {
          console.error(`   ❌ 獲取最新訊息失敗:`, fetchError);
          throw new Error(`無法獲取頻道最新訊息: ${fetchError.message}`);
        }
      } else {
        console.log(`   錨點訊息 ID: ${anchorMessageId}`);
      }

      // 階段 1: 從錨點向後提取（提取歷史訊息）
      console.log(`   階段 1: 從錨點向後提取歷史訊息...`);
      let lastId = anchorMessageId;
      let hasMore = true;
      const batchSize = 100;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;
        console.log(`   📥 提取批次 ${batchCount} (before: ${lastId})...`);

        const messages = await this.fetchBatch(channel, {
          limit: batchSize,
          before: lastId,
        });

        console.log(`   ✅ 獲取到 ${messages.size} 則訊息`);

        if (messages.size === 0) {
          console.log(`   ⏹️  沒有更多歷史訊息`);
          hasMore = false;
          break;
        }

        // 處理訊息
        for (const [, message] of messages) {
          if (message.author.bot) continue;

          messagesFetched++;

          // 記錄最舊和最新的訊息
          if (!oldestMessageId || message.id < oldestMessageId) {
            oldestMessageId = message.id;
            oldestTimestamp = message.createdAt;
          }
          if (!newestMessageId || message.id > newestMessageId) {
            newestMessageId = message.id;
            newestTimestamp = message.createdAt;
          }

          try {
            // 檢查是否已存在
            const existing = await this.pool.query(
              "SELECT 1 FROM messages WHERE message_id = $1",
              [message.id]
            );

            if (existing.rows.length > 0) {
              messagesDuplicate++;
            } else {
              await saveMessage(this.pool, message);
              if (message.content) {
                await saveEmojiUsage(this.pool, message);
              }
              messagesSaved++;
            }
          } catch (error) {
            console.error(`❌ 儲存訊息失敗 ${message.id}:`, error.message);
          }
        }

        // 更新進度
        this.activeTasks.set(taskId, {
          status: "running",
          progress: {
            messagesFetched,
            messagesSaved,
            messagesDuplicate,
          },
        });

        lastId = messages.last().id;

        // 每批次後稍作延遲，避免 rate limit
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(
          `   已提取 ${messagesFetched} 則訊息 (已儲存: ${messagesSaved}, 重複: ${messagesDuplicate})`
        );
      }

      // 階段 2: 從錨點向前提取新訊息（持續提取直到最新）
      console.log(`   階段 2: 從錨點向前提取新訊息...`);
      let afterId = anchorMessageId;
      let hasMoreNew = true;
      let newBatchCount = 0;

      while (hasMoreNew) {
        newBatchCount++;
        console.log(
          `   📥 提取新訊息批次 ${newBatchCount} (after: ${afterId})...`
        );

        const newMessages = await this.fetchBatch(channel, {
          limit: batchSize,
          after: afterId,
        });

        console.log(`   ✅ 獲取到 ${newMessages.size} 則新訊息`);

        if (newMessages.size === 0) {
          console.log(`   ⏹️  已到達最新訊息`);
          hasMoreNew = false;
          break;
        }

        for (const [, message] of newMessages) {
          if (message.author.bot) continue;

          messagesFetched++;

          if (!newestMessageId || message.id > newestMessageId) {
            newestMessageId = message.id;
            newestTimestamp = message.createdAt;
          }

          try {
            const existing = await this.pool.query(
              "SELECT 1 FROM messages WHERE message_id = $1",
              [message.id]
            );

            if (existing.rows.length > 0) {
              messagesDuplicate++;
            } else {
              await saveMessage(this.pool, message);
              if (message.content) {
                await saveEmojiUsage(this.pool, message);
              }
              messagesSaved++;
            }
          } catch (error) {
            console.error(`❌ 儲存訊息失敗 ${message.id}:`, error.message);
          }
        }

        // 更新進度
        this.activeTasks.set(taskId, {
          status: "running",
          progress: {
            messagesFetched,
            messagesSaved,
            messagesDuplicate,
          },
        });

        afterId = newMessages.last().id;

        // 每批次後稍作延遲
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log(
          `   已提取 ${messagesFetched} 則訊息 (已儲存: ${messagesSaved}, 重複: ${messagesDuplicate})`
        );
      }

      // 檢查範圍重疊
      let finalStatus = "completed";
      if (oldestTimestamp && newestTimestamp) {
        const overlap = await this.checkRangeOverlap(
          guildId,
          channelId,
          oldestTimestamp,
          newestTimestamp
        );

        if (overlap.overlap_count > 0) {
          console.log(
            `⚠️  警告: 發現 ${overlap.overlap_count} 個重疊的提取範圍`
          );
          finalStatus = "warning";
        }

        // 記錄此次提取範圍
        await this.recordFetchRange(
          guildId,
          channelId,
          oldestMessageId,
          newestMessageId,
          oldestTimestamp,
          newestTimestamp,
          messagesSaved,
          taskId
        );
      }

      // 階段 3: 提取該頻道的所有討論串
      console.log(`   階段 3: 檢查討論串...`);
      try {
        const threads = await channel.threads.fetchActive();
        const archivedThreads = await channel.threads.fetchArchived();

        const allThreads = [
          ...threads.threads.values(),
          ...archivedThreads.threads.values(),
        ];

        if (allThreads.length > 0) {
          console.log(`   找到 ${allThreads.length} 個討論串`);

          for (const thread of allThreads) {
            console.log(`   📝 提取討論串: ${thread.name}`);

            try {
              // 提取討論串的所有訊息
              const threadMessages = await thread.messages.fetch({
                limit: 100,
              });
              let threadLastId = threadMessages.last()?.id;

              // 持續提取直到沒有更多訊息
              while (threadLastId) {
                const olderMessages = await thread.messages.fetch({
                  limit: 100,
                  before: threadLastId,
                });

                if (olderMessages.size === 0) break;

                threadMessages.concat(olderMessages);
                threadLastId = olderMessages.last()?.id;
              }

              // 儲存討論串訊息
              for (const [, message] of threadMessages) {
                if (message.author.bot) continue;

                messagesFetched++;

                try {
                  const existing = await this.pool.query(
                    "SELECT 1 FROM messages WHERE message_id = $1",
                    [message.id]
                  );

                  if (existing.rows.length > 0) {
                    messagesDuplicate++;
                  } else {
                    await saveMessage(this.pool, message);
                    if (message.content && message.content.length > 0) {
                      await saveEmojiUsage(this.pool, message);
                    }
                    messagesSaved++;
                  }
                } catch (error) {
                  console.error(
                    `❌ 儲存討論串訊息失敗 ${message.id}:`,
                    error.message
                  );
                }
              }

              console.log(
                `   ✅ 討論串 "${thread.name}": ${threadMessages.size} 則訊息`
              );
            } catch (threadError) {
              console.error(
                `   ❌ 提取討論串 "${thread.name}" 失敗:`,
                threadError.message
              );
            }
          }
        } else {
          console.log(`   ℹ️  沒有討論串`);
        }
      } catch (threadsError) {
        console.error(`   ⚠️  無法獲取討論串:`, threadsError.message);
      }

      // 完成任務
      await this.updateTaskStatus(taskId, finalStatus, {
        completedAt: new Date(),
        messagesFetched,
        messagesSaved,
        messagesDuplicate,
        startMessageId: oldestMessageId,
        endMessageId: newestMessageId,
      });

      this.activeTasks.delete(taskId);

      const duration = ((new Date() - startTime) / 1000).toFixed(2);
      console.log(`\n${"=".repeat(60)}`);
      console.log(`✅ 提取完成 (任務 ${taskId})`);
      console.log(`   頻道: ${channel.name}`);
      console.log(`   總訊息數: ${messagesFetched}`);
      console.log(`   已儲存: ${messagesSaved}`);
      console.log(`   重複: ${messagesDuplicate}`);
      console.log(`   耗時: ${duration} 秒`);
      if (oldestTimestamp && newestTimestamp) {
        console.log(
          `   時間範圍: ${oldestTimestamp.toISOString()} ~ ${newestTimestamp.toISOString()}`
        );
        console.log(`   訊息 ID 範圍: ${oldestMessageId} ~ ${newestMessageId}`);
      }
      console.log(`${"=".repeat(60)}\n`);

      return {
        success: true,
        messagesFetched,
        messagesSaved,
        messagesDuplicate,
        status: finalStatus,
      };
    } catch (error) {
      console.error(`❌ 提取失敗 (任務 ${taskId}):`, error);

      await this.updateTaskStatus(taskId, "failed", {
        completedAt: new Date(),
        messagesFetched,
        messagesSaved,
        messagesDuplicate,
        errorMessage: error.message,
      });

      this.activeTasks.delete(taskId);

      return {
        success: false,
        error: error.message,
        messagesFetched,
        messagesSaved,
        messagesDuplicate,
      };
    }
  }

  // 獲取任務進度
  getTaskProgress(taskId) {
    return this.activeTasks.get(taskId) || null;
  }

  // 獲取所有活躍任務
  getActiveTasks() {
    return Array.from(this.activeTasks.entries()).map(([taskId, data]) => ({
      taskId,
      ...data,
    }));
  }

  // 從單個頻道或討論串提取訊息（用於論壇頻道的討論串）
  async fetchMessagesFromChannel(channel, guild, taskId, anchorMessageId) {
    let messagesFetched = 0;
    let messagesSaved = 0;
    let messagesDuplicate = 0;

    try {
      // 如果 anchorMessageId 是 "latest"，獲取最新訊息
      let actualAnchorId = anchorMessageId;
      if (anchorMessageId === "latest") {
        try {
          const latestMessages = await channel.messages.fetch({ limit: 1 });
          if (latestMessages.size > 0) {
            actualAnchorId = latestMessages.first().id;
          } else {
            console.log(`      ⚠️ 討論串沒有訊息，跳過`);
            return 0;
          }
        } catch (error) {
          console.error(`      ❌ 獲取最新訊息失敗:`, error.message);
          return 0;
        }
      }

      // 從錨點向後提取（歷史訊息）
      let lastId = actualAnchorId;
      let hasMore = true;
      const batchSize = 100;

      while (hasMore) {
        const messages = await this.fetchBatch(channel, {
          limit: batchSize,
          before: lastId,
        });

        if (messages.length === 0) {
          hasMore = false;
          break;
        }

        // 處理訊息
        for (const message of messages) {
          const saved = await saveMessage(this.pool, message, guild.id);
          messagesFetched++;
          if (saved) {
            messagesSaved++;
          } else {
            messagesDuplicate++;
          }

          // 處理 emoji
          if (message.reactions && message.reactions.cache.size > 0) {
            for (const reaction of message.reactions.cache.values()) {
              await saveEmojiUsage(
                this.pool,
                guild.id,
                reaction.emoji,
                message.author.id
              );
            }
          }
        }

        if (messages.length < batchSize) {
          hasMore = false;
        } else {
          lastId = messages[messages.length - 1].id;
        }

        // 短暫延遲避免速率限制
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // 從錨點向前提取（較新的訊息）
      lastId = actualAnchorId;
      hasMore = true;

      while (hasMore) {
        const messages = await this.fetchBatch(channel, {
          limit: batchSize,
          after: lastId,
        });

        if (messages.length === 0) {
          hasMore = false;
          break;
        }

        // 處理訊息
        for (const message of messages) {
          const saved = await saveMessage(this.pool, message, guild.id);
          messagesFetched++;
          if (saved) {
            messagesSaved++;
          } else {
            messagesDuplicate++;
          }

          // 處理 emoji
          if (message.reactions && message.reactions.cache.size > 0) {
            for (const reaction of message.reactions.cache.values()) {
              await saveEmojiUsage(
                this.pool,
                guild.id,
                reaction.emoji,
                message.author.id
              );
            }
          }
        }

        if (messages.length < batchSize) {
          hasMore = false;
        } else {
          lastId = messages[0].id;
        }

        // 短暫延遲避免速率限制
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(
        `      ✅ 提取完成: ${messagesFetched} 條訊息 (新增: ${messagesSaved}, 重複: ${messagesDuplicate})`
      );

      return messagesFetched;
    } catch (error) {
      console.error(`      ❌ 提取失敗:`, error.message);
      throw error;
    }
  }
}

module.exports = HistoryFetcher;
