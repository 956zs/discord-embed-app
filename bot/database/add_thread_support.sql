-- 添加討論串支援
-- 執行: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f bot/database/add_thread_support.sql

\echo '添加討論串支援...'
\echo ''

-- 1. 添加 is_thread 欄位
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'is_thread'
    ) THEN
        ALTER TABLE messages ADD COLUMN is_thread BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ 已添加 is_thread 欄位';
    ELSE
        RAISE NOTICE '⏭️  is_thread 欄位已存在';
    END IF;
END $$;

-- 2. 添加 thread_id 欄位
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'thread_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN thread_id VARCHAR(20);
        RAISE NOTICE '✅ 已添加 thread_id 欄位';
    ELSE
        RAISE NOTICE '⏭️  thread_id 欄位已存在';
    END IF;
END $$;

-- 3. 添加 parent_channel_id 欄位
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'parent_channel_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN parent_channel_id VARCHAR(20);
        RAISE NOTICE '✅ 已添加 parent_channel_id 欄位';
    ELSE
        RAISE NOTICE '⏭️  parent_channel_id 欄位已存在';
    END IF;
END $$;

-- 4. 創建索引
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_is_thread ON messages(is_thread) WHERE is_thread = TRUE;

\echo ''
\echo '✅ 討論串支援添加完成！'
\echo ''

-- 顯示 messages 表結構
\d messages
