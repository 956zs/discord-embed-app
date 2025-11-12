---
inclusion: always
---

# Product Overview

Discord 伺服器統計與可視化 Embedded App - A full-featured Discord Embedded App for displaying server statistics including member activity, channel usage, message trends, emoji usage, and keyword clouds.

## Core Features

- Server overview (member count, channels, roles)
- Message trends (7-day message volume and active user charts)
- Channel usage statistics
- Member activity leaderboard
- Emoji usage rankings (custom and Unicode)
- Keyword cloud visualization

## Architecture

Three-tier application:
- **Bot**: Discord.js bot for data collection, stores to PostgreSQL
- **Server**: Express API serving statistics endpoints
- **Client**: React + TypeScript dashboard with Chart.js visualizations

## Guild Whitelist

Production deployments must configure `ALLOWED_GUILD_IDS` in `.env` to restrict data collection and API access to authorized Discord servers only.
