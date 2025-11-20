const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

/**
 * PM2 進程資訊工具
 *
 * 提供讀取 PM2 進程狀態的功能
 */
class PM2Info {
  /**
   * 獲取 PM2 進程列表
   * @returns {Promise<Array>} PM2 進程列表
   */
  async getProcessList() {
    try {
      // 使用 pm2 jlist 獲取 JSON 格式的進程列表
      const { stdout } = await execAsync("pm2 jlist");
      const processes = JSON.parse(stdout);

      // 過濾出 discord-app 相關的進程
      const appProcesses = processes.filter(
        (p) =>
          p.name === "discord-app" ||
          p.name === "discord-bot" ||
          p.name === "discord-client"
      );

      return appProcesses.map((p) => ({
        name: p.name,
        pid: p.pid,
        status: p.pm2_env.status,
        uptime: Date.now() - p.pm2_env.pm_uptime,
        restarts: p.pm2_env.restart_time,
        cpu: p.monit.cpu,
        memory: Math.round(p.monit.memory / 1024 / 1024), // MB
        mode: p.pm2_env.exec_mode,
      }));
    } catch (error) {
      console.error("❌ 獲取 PM2 進程列表失敗:", error.message);
      return [];
    }
  }

  /**
   * 檢測進程模式（單進程或雙進程）
   * @returns {Promise<string>} "single" 或 "dual"
   */
  async detectProcessMode() {
    try {
      const processes = await this.getProcessList();

      // 如果只有一個 discord-app 進程，是單進程模式
      const appProcess = processes.find((p) => p.name === "discord-app");
      const botProcess = processes.find((p) => p.name === "discord-bot");
      const clientProcess = processes.find((p) => p.name === "discord-client");

      if (appProcess && !botProcess && !clientProcess) {
        return "single";
      }

      if (botProcess || clientProcess) {
        return "dual";
      }

      // 預設為單進程
      return "single";
    } catch (error) {
      console.error("❌ 檢測進程模式失敗:", error.message);
      return "unknown";
    }
  }

  /**
   * 獲取進程摘要資訊
   * @returns {Promise<Object>} 進程摘要
   */
  async getProcessSummary() {
    try {
      const processes = await this.getProcessList();
      const mode = await this.detectProcessMode();

      const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
      const totalMemory = processes.reduce((sum, p) => sum + p.memory, 0);
      const totalRestarts = processes.reduce((sum, p) => sum + p.restarts, 0);

      return {
        mode,
        count: processes.length,
        processes,
        summary: {
          totalCpu: Math.round(totalCpu * 10) / 10,
          totalMemory,
          totalRestarts,
          allRunning: processes.every((p) => p.status === "online"),
        },
      };
    } catch (error) {
      console.error("❌ 獲取進程摘要失敗:", error.message);
      return {
        mode: "unknown",
        count: 0,
        processes: [],
        summary: {
          totalCpu: 0,
          totalMemory: 0,
          totalRestarts: 0,
          allRunning: false,
        },
      };
    }
  }
}

module.exports = new PM2Info();
