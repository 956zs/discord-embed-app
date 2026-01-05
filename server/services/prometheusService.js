/**
 * Prometheus Service - 从 Prometheus API 获取系统指标
 *
 * 替代 Node.js os 模块，使用 Prometheus + Node Exporter 收集的数据
 * 提供更准确、更丰富的系统监控指标
 */

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://localhost:9090";
const QUERY_TIMEOUT = 5000;

/**
 * 查询 Prometheus API
 * @param {string} query - PromQL 查询语句
 * @returns {Promise<object>} Prometheus 响应
 */
async function queryPrometheus(query) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Prometheus query failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(`Prometheus query failed: ${data.error || "unknown error"}`);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Prometheus query timeout");
    }
    throw error;
  }
}

/**
 * 从 Prometheus 结果中提取数值
 * @param {object} result - Prometheus API 响应
 * @returns {number} 提取的数值
 */
function extractValue(result) {
  try {
    const results = result?.data?.result || [];
    if (results.length === 0) return 0;
    const value = results[0]?.value?.[1];
    return value !== undefined ? parseFloat(value) : 0;
  } catch {
    return 0;
  }
}

/**
 * 从 Prometheus 结果中提取多个值（用于 per-core 等）
 * @param {object} result - Prometheus API 响应
 * @returns {Array<{label: string, value: number}>}
 */
function extractMultipleValues(result) {
  try {
    const results = result?.data?.result || [];
    return results.map((r) => ({
      label: r.metric?.cpu || r.metric?.device || r.metric?.mountpoint || "unknown",
      value: parseFloat(r.value?.[1] || 0),
    }));
  } catch {
    return [];
  }
}

/**
 * 从 node_dmi_info 提取系统信息标签
 * @param {object} result - Prometheus API 响应
 * @returns {object} 系统信息
 */
function extractDmiInfo(result) {
  try {
    const results = result?.data?.result || [];
    if (results.length === 0) return {};
    const metric = results[0]?.metric || {};
    return {
      productName: metric.product_name || "Unknown",
      systemVendor: metric.system_vendor || "Unknown",
    };
  } catch {
    return {};
  }
}

/**
 * 并行查询所有指标
 * @returns {Promise<object>} 完整的系统指标
 */
async function getAllMetrics() {
  const queries = {
    // 系统信息
    dmiInfo: "node_dmi_info",
    cpuCount: "count(count(node_cpu_seconds_total) by (cpu))",

    // 时间和负载
    uptime: "node_time_seconds - node_boot_time_seconds",
    load1: "node_load1",
    load5: "node_load5",
    load15: "node_load15",

    // CPU 指标
    cpuUsage: '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)',
    cpuUser: 'avg(rate(node_cpu_seconds_total{mode="user"}[1m])) * 100',
    cpuSystem: 'avg(rate(node_cpu_seconds_total{mode="system"}[1m])) * 100',
    cpuIowait: 'avg(rate(node_cpu_seconds_total{mode="iowait"}[1m])) * 100',
    cpuSteal: 'avg(rate(node_cpu_seconds_total{mode="steal"}[1m])) * 100',
    cpuIdle: 'avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100',
    cpuPerCore: '100 - (rate(node_cpu_seconds_total{mode="idle"}[1m]) * 100)',

    // 记忆体指标
    memTotal: "node_memory_MemTotal_bytes",
    memAvailable: "node_memory_MemAvailable_bytes",
    memCached: "node_memory_Cached_bytes + node_memory_Buffers_bytes",
    memActive: "node_memory_Active_bytes",
    memInactive: "node_memory_Inactive_bytes",
    swapTotal: "node_memory_SwapTotal_bytes",
    swapFree: "node_memory_SwapFree_bytes",

    // 硬碟指标（根分区）
    diskTotal: 'node_filesystem_size_bytes{mountpoint="/"}',
    diskAvail: 'node_filesystem_avail_bytes{mountpoint="/"}',
    inodesTotal: 'node_filesystem_files{mountpoint="/"}',
    inodesFree: 'node_filesystem_files_free{mountpoint="/"}',

    // 硬碟 I/O（主磁盘 vda 或 sda）
    diskReadMBps: "rate(node_disk_read_bytes_total[1m]) / 1024 / 1024",
    diskWriteMBps: "rate(node_disk_written_bytes_total[1m]) / 1024 / 1024",
    diskReadIOPS: "rate(node_disk_reads_completed_total[1m])",
    diskWriteIOPS: "rate(node_disk_writes_completed_total[1m])",
    diskIOPercent: "rate(node_disk_io_time_seconds_total[1m]) * 100",

    // 网络指标（eth0 或主网卡）
    netRxMBps: 'rate(node_network_receive_bytes_total{device!~"lo|docker.*|br-.*|veth.*"}[1m]) / 1024 / 1024',
    netTxMBps: 'rate(node_network_transmit_bytes_total{device!~"lo|docker.*|br-.*|veth.*"}[1m]) / 1024 / 1024',
    netRxPackets: 'rate(node_network_receive_packets_total{device!~"lo|docker.*|br-.*|veth.*"}[1m])',
    netTxPackets: 'rate(node_network_transmit_packets_total{device!~"lo|docker.*|br-.*|veth.*"}[1m])',
    netRxErrors: 'rate(node_network_receive_errs_total{device!~"lo|docker.*|br-.*|veth.*"}[1m])',
    netTxErrors: 'rate(node_network_transmit_errs_total{device!~"lo|docker.*|br-.*|veth.*"}[1m])',
    netRxDrops: 'rate(node_network_receive_drop_total{device!~"lo|docker.*|br-.*|veth.*"}[1m])',
    netTxDrops: 'rate(node_network_transmit_drop_total{device!~"lo|docker.*|br-.*|veth.*"}[1m])',
    netRxTotal: 'node_network_receive_bytes_total{device!~"lo|docker.*|br-.*|veth.*"} / 1024 / 1024 / 1024',
    netTxTotal: 'node_network_transmit_bytes_total{device!~"lo|docker.*|br-.*|veth.*"} / 1024 / 1024 / 1024',

    // TCP 连线
    tcpConnections: "node_netstat_Tcp_CurrEstab",
    tcpRetrans: "rate(node_netstat_Tcp_RetransSegs[1m])",
  };

  // 并行执行所有查询
  const queryEntries = Object.entries(queries);
  const results = await Promise.allSettled(
    queryEntries.map(([, query]) => queryPrometheus(query))
  );

  // 将结果映射回键值对
  const data = {};
  queryEntries.forEach(([key], index) => {
    const result = results[index];
    data[key] = result.status === "fulfilled" ? result.value : null;
  });

  // 提取并构建结构化数据
  const bytesToMB = (bytes) => Math.round(bytes / 1024 / 1024);
  const bytesToGB = (bytes) => Math.round((bytes / 1024 / 1024 / 1024) * 100) / 100;
  const round2 = (n) => Math.round(n * 100) / 100;

  const memTotal = extractValue(data.memTotal);
  const memAvailable = extractValue(data.memAvailable);
  const memUsed = memTotal - memAvailable;

  const diskTotal = extractValue(data.diskTotal);
  const diskAvail = extractValue(data.diskAvail);
  const diskUsed = diskTotal - diskAvail;

  const inodesTotal = extractValue(data.inodesTotal);
  const inodesFree = extractValue(data.inodesFree);

  const swapTotal = extractValue(data.swapTotal);
  const swapFree = extractValue(data.swapFree);

  // 提取每核心 CPU 使用率
  const perCoreData = extractMultipleValues(data.cpuPerCore);
  const perCore = perCoreData
    .filter((c) => c.label !== "unknown")
    .sort((a, b) => parseInt(a.label) - parseInt(b.label))
    .map((c) => round2(c.value));

  // 提取硬碟 I/O（合并所有设备）
  const diskReadData = extractMultipleValues(data.diskReadMBps);
  const diskWriteData = extractMultipleValues(data.diskWriteMBps);
  const diskReadIOPSData = extractMultipleValues(data.diskReadIOPS);
  const diskWriteIOPSData = extractMultipleValues(data.diskWriteIOPS);
  const diskIOData = extractMultipleValues(data.diskIOPercent);

  const sumValues = (arr) => arr.reduce((sum, item) => sum + item.value, 0);

  // 提取网络（合并所有非 lo 接口）
  const netRxData = extractMultipleValues(data.netRxMBps);
  const netTxData = extractMultipleValues(data.netTxMBps);

  const dmiInfo = extractDmiInfo(data.dmiInfo);

  return {
    system: {
      hostname: dmiInfo.productName || require("os").hostname(),
      platform: process.platform,
      cpuCores: Math.round(extractValue(data.cpuCount)) || require("os").cpus().length,
      vendor: dmiInfo.systemVendor,
    },
    memory: {
      totalMB: bytesToMB(memTotal),
      usedMB: bytesToMB(memUsed),
      availableMB: bytesToMB(memAvailable),
      cachedMB: bytesToMB(extractValue(data.memCached)),
      activeMB: bytesToMB(extractValue(data.memActive)),
      inactiveMB: bytesToMB(extractValue(data.memInactive)),
      usedPercent: memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0,
      swap: {
        totalMB: bytesToMB(swapTotal),
        usedMB: bytesToMB(swapTotal - swapFree),
        freeMB: bytesToMB(swapFree),
        usedPercent: swapTotal > 0 ? Math.round(((swapTotal - swapFree) / swapTotal) * 100) : 0,
      },
    },
    cpu: {
      usage: round2(extractValue(data.cpuUsage)),
      user: round2(extractValue(data.cpuUser)),
      system: round2(extractValue(data.cpuSystem)),
      iowait: round2(extractValue(data.cpuIowait)),
      steal: round2(extractValue(data.cpuSteal)),
      idle: round2(extractValue(data.cpuIdle)),
      perCore,
    },
    disk: {
      totalGB: bytesToGB(diskTotal),
      usedGB: bytesToGB(diskUsed),
      availableGB: bytesToGB(diskAvail),
      usedPercent: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0,
      inodes: {
        total: Math.round(inodesTotal),
        free: Math.round(inodesFree),
        usedPercent: inodesTotal > 0 ? Math.round(((inodesTotal - inodesFree) / inodesTotal) * 100) : 0,
      },
    },
    diskIO: {
      readMBps: round2(sumValues(diskReadData)),
      writeMBps: round2(sumValues(diskWriteData)),
      readIOPS: round2(sumValues(diskReadIOPSData)),
      writeIOPS: round2(sumValues(diskWriteIOPSData)),
      ioPercent: round2(Math.min(sumValues(diskIOData), 100)),
    },
    network: {
      rxMBps: round2(sumValues(netRxData)),
      txMBps: round2(sumValues(netTxData)),
      rxPackets: round2(sumValues(extractMultipleValues(data.netRxPackets))),
      txPackets: round2(sumValues(extractMultipleValues(data.netTxPackets))),
      rxErrors: round2(sumValues(extractMultipleValues(data.netRxErrors))),
      txErrors: round2(sumValues(extractMultipleValues(data.netTxErrors))),
      rxDrops: round2(sumValues(extractMultipleValues(data.netRxDrops))),
      txDrops: round2(sumValues(extractMultipleValues(data.netTxDrops))),
      rxTotalGB: round2(sumValues(extractMultipleValues(data.netRxTotal))),
      txTotalGB: round2(sumValues(extractMultipleValues(data.netTxTotal))),
    },
    load: {
      avg1: round2(extractValue(data.load1)),
      avg5: round2(extractValue(data.load5)),
      avg15: round2(extractValue(data.load15)),
    },
    connections: {
      tcpEstablished: Math.round(extractValue(data.tcpConnections)),
      tcpRetransPerSec: round2(extractValue(data.tcpRetrans)),
    },
    uptime: Math.round(extractValue(data.uptime)),
    timestamp: Date.now(),
  };
}

/**
 * 检查 Prometheus 是否可用
 * @returns {Promise<boolean>}
 */
async function isPrometheusAvailable() {
  try {
    const result = await queryPrometheus("up");
    return result?.status === "success";
  } catch {
    return false;
  }
}

module.exports = {
  queryPrometheus,
  extractValue,
  extractMultipleValues,
  getAllMetrics,
  isPrometheusAvailable,
  PROMETHEUS_URL,
};
