import { Database } from "bun:sqlite";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

/**
 * Represents the available formats for log output.
 * @enum {string}
 * @property {string} TEXT - Plain text format with '.txt' extension
 * @property {string} JSON - JSON format with '.json' extension
 * @property {string} CSV - Comma-separated values format with '.csv' extension
 */
export enum LogFormat {
  TEXT = 'txt',
  JSON = 'json',
  CSV = 'csv'
}

/**
 * Represents a single log entry with timestamp, severity level, and message content.
 * @interface LogEntry
 * @property {string} timestamp - The date and time when the log entry was created
 * @property {string} level - The severity level of the log entry (e.g., 'info', 'error', 'warn')
 * @property {string} message - The actual content/message of the log entry
 */
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

/**
 * Configuration options for the Wlog logging utility.
 */
/**
 * Configuration options for setting up a server.
 *
 * @interface ServerOptions
 * @property {boolean} [enable] - Flag to enable/disable the server. Optional.
 * @property {number} [port] - Port number on which the server will listen. Optional.
 * @property {string} [path] - Base path for the server. Optional.
 * @property {string} [livePath] - Path for live server functionality. Optional.
 */
interface ServerOptions {
  enable?: boolean;
  port?: number;
  path?: string;
  livePath?: string;
}

/**
 * Configuration options for the Wlog logging system.
 * @interface WlogConfig
 * @property {boolean} [logToConsole] - If true, logs will be output to the console. Defaults to false.
 * @property {boolean} [logToFile] - If true, logs will be written to a file. Defaults to false.
 * @property {string} [filePath] - The file path where logs should be written if `logToFile` is true. Defaults to 'logs.txt'.
 * @property {LogFormat} [fileFormat] - The format in which logs should be written if `logToFile` is true. Defaults to LogFormat.TEXT.
 * @property {ServerOptions} [serverOptions] - Configuration options for the server component.
 */
interface WlogConfig {
  /**
   * If true, logs will be output to the console.
   * @default false
   */
  logToConsole?: boolean;

  /**
   * If true, logs will be written to a file.
   * @default false
   */
  logToFile?: boolean;

  /**
   * The file path where logs should be written if `logToFile` is true.
   * @default 'logs.txt'
   */
  filePath?: string;

  /**
   * The format in which logs should be written if `logToFile` is true.
   * @default LogFormat.TEXT
   */
  fileFormat?: LogFormat;

  serverOptions?: ServerOptions;
}

/**
 * Interface representing query parameters for log filtering and pagination
 * @interface
 * @property {string} [startDate] - The start date to filter logs from (optional)
 * @property {string} [endDate] - The end date to filter logs until (optional)
 * @property {string} [level] - The log level to filter by (optional)
 * @property {number} [limit] - The maximum number of logs to return (optional)
 * @property {number} [offset] - The number of logs to skip (optional)
 * @property {'ASC' | 'DESC'} [order] - The order of returned logs (optional)
 */
interface LogQueryParams {
  startDate?: string;
  endDate?: string;
  level?: string;
  limit?: number;
  offset?: number;
  order?: 'ASC' | 'DESC';
}

class Wlog {
  db: Database;
  config: Required<WlogConfig>;

  constructor(config: WlogConfig = {}) {
    this.db = new Database("wlog.db");
    this.db.run(`
      CREATE TABLE IF NOT EXISTS logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);
    this.config = {
      logToConsole: config.logToConsole ?? true,
      logToFile: config.logToFile ?? false,
      filePath: config.filePath ?? "logs",
      fileFormat: config.fileFormat ?? LogFormat.TEXT,
      serverOptions: {
        enable: config.serverOptions?.enable ?? false,
        port: config.serverOptions?.port ?? 3000,
        path: config.serverOptions?.path ?? "/logs",
        livePath: config.serverOptions?.livePath ?? "/live",
      },
    };

    if (this.config.serverOptions.enable) {
      Bun.serve({
        port: this.config.serverOptions.port,
        fetch: (req) => {
          const url = new URL(req.url);
          if (url.pathname === this.config.serverOptions.path) {
            const params: LogQueryParams = {
              startDate: url.searchParams.get('startDate') || undefined,
              endDate: url.searchParams.get('endDate') || undefined,
              level: url.searchParams.get('level') || undefined,
              limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
              offset: url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!) : undefined,
              order: (url.searchParams.get('order')?.toUpperCase() as 'ASC' | 'DESC') || 'DESC'
            };

            const { query, values } = this.buildQueryFromParams(params);
            const statement = this.db.prepare(query);
            const logs = statement.all(...values);

            return new Response(JSON.stringify(logs), {
              headers: { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
              }
            });
          } else if (url.pathname === this.config.serverOptions.livePath) {
            return new Response(`
              <!DOCTYPE html>
              <html class="dark">
              <head>
                <title>Wlog Live</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shadcn/ui@latest/dist/index.min.css" />
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                  .dark { background-color: #020817; color: #fff; }
                </style>
              </head>
              <body class="container mx-auto p-4">
                <div id="app"></div>
                <script type="module">
                  import { h, render } from "https://esm.sh/preact";
                  import { useEffect, useState } from "https://esm.sh/preact/hooks";

                  const Badge = ({ level }) => {
                    const colors = {
                      error: 'bg-red-500',
                      info: 'bg-blue-500',
                      log: 'bg-gray-500'
                    };
                    return h('span', {
                      class: \`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium \${colors[level.toLowerCase()]}\`
                    }, level);
                  };

                  function App() {
                    const [logs, setLogs] = useState([]);
                    
                    useEffect(() => {
                      const fetchLogs = async () => {
                        const res = await fetch('${this.config.serverOptions.path}');
                        const data = await res.json();
                        setLogs(data);
                      };
                      
                      fetchLogs();
                      const interval = setInterval(fetchLogs, 2000);
                      return () => clearInterval(interval);
                    }, []);

                    return h('div', { class: 'space-y-4' }, [
                      h('div', { class: 'flex justify-between items-center' }, [
                        h('h1', { class: 'text-2xl font-bold' }, 'Wlog Live Logs'),
                        h('span', { class: 'text-sm text-gray-500' }, 'Auto-refreshing every 2s')
                      ]),
                      h('div', { class: 'border rounded-lg' }, [
                        h('div', { class: 'overflow-x-auto' }, [
                          h('table', { class: 'w-full text-sm' }, [
                            h('thead', { class: 'border-b' }, 
                              h('tr', { class: 'bg-muted/50' }, [
                                h('th', { class: 'p-3 text-left' }, 'Timestamp'),
                                h('th', { class: 'p-3 text-left' }, 'Level'),
                                h('th', { class: 'p-3 text-left' }, 'Message')
                              ])
                            ),
                            h('tbody', null, 
                              logs.map(log => h('tr', { 
                                class: 'border-b transition-colors hover:bg-muted/50',
                                key: log.id 
                              }, [
                                h('td', { class: 'p-3' }, new Date(log.timestamp).toLocaleString()),
                                h('td', { class: 'p-3' }, h(Badge, { level: log.level })),
                                h('td', { class: 'p-3' }, log.message)
                              ]))
                            )
                          ])
                        ])
                      ])
                    ]);
                  }

                  render(h(App, null), document.getElementById('app'));
                </script>
              </body>
              </html>
            `, { headers: { "Content-Type": "text/html" } });
          }
          return new Response("Wlog Server Running");
        },
      });
    }
  }

  private getTimestamp(): string {
    return new Date().toLocaleString();
  }

  private getFullFilePath(): string {
    return `${this.config.filePath}.${this.config.fileFormat}`;
  }

  private formatLogEntry(level: string, message: string): LogEntry {
    return {
      timestamp: this.getTimestamp(),
      level,
      message
    };
  }

  private ensureDirectoryExists(filePath: string) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private writeToFile(entry: LogEntry) {
    try {
      const filePath = this.getFullFilePath();
      this.ensureDirectoryExists(filePath);

      let content = '';
      let newContent = '';

      if (existsSync(filePath)) {
        content = readFileSync(filePath, 'utf-8');
      }

      switch (this.config.fileFormat) {
        case LogFormat.JSON:
          const logs = content ? JSON.parse(content) : [];
          logs.push(entry);
          newContent = JSON.stringify(logs, null, 2);
          break;

        case LogFormat.CSV:
          if (!content) {
            content = 'timestamp,level,message\n';
          }
          newContent = content + `${entry.timestamp},${entry.level},${entry.message}\n`;
          break;

        case LogFormat.TEXT:
        default:
          newContent = content + `[${entry.timestamp}] [${entry.level}] ${entry.message}\n`;
          break;
      }

      writeFileSync(filePath, newContent);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private buildQueryFromParams(params: LogQueryParams): { query: string, values: any[] } {
    let conditions: string[] = [];
    let values: any[] = [];

    if (params.startDate) {
      conditions.push("timestamp >= ?");
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push("timestamp <= ?");
      values.push(params.endDate);
    }

    if (params.level) {
      conditions.push("level = ?");
      values.push(params.level);
    }

    let query = "SELECT * FROM logs";
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDER BY timestamp ${params.order || 'DESC'}`;

    if (params.limit) {
      query += " LIMIT ?";
      values.push(params.limit);

      if (params.offset) {
        query += " OFFSET ?";
        values.push(params.offset);
      }
    }

    return { query, values };
  }

  /**
   * Logs a message to the database, console, and/or file based on the configuration.
   *
   * @param message - The message to log.
   */
  log(message: string) {
    this.db.run("INSERT INTO logs (level, message, timestamp) VALUES (?, ?, ?)", 
      ["log", message, new Date().toISOString()]);
    
    if (this.config.logToConsole) {
      console.log(`[${this.getTimestamp()}] [LOG] ${message}`);
    }
    
    if (this.config.logToFile) {
      this.writeToFile(this.formatLogEntry('LOG', message));
    }
  }

  info(message: string) {
    this.db.run("INSERT INTO logs (level, message, timestamp) VALUES (?, ?, ?)", ["info", message, new Date().toISOString()]);
    if (this.config.logToConsole) {
      console.info(`[${this.getTimestamp()}] [INFO] ${message}`);
    }
    if (this.config.logToFile) {
      this.writeToFile(this.formatLogEntry('INFO', message));
    }
  }

  error(message: string) {
    this.db.run("INSERT INTO logs (level, message, timestamp) VALUES (?, ?, ?)", ["error", message, new Date().toISOString()]);
    if (this.config.logToConsole) {
      console.error(`[${this.getTimestamp()}] [ERROR] ${message}`);
    }
    if (this.config.logToFile) {
      this.writeToFile(this.formatLogEntry('ERROR', message));
    }
  }
}

export default Wlog
