# Wlog

A flexible logging utility for Bun applications with multiple output formats and real-time web interface.

## Features

- Multiple logging formats (TEXT, JSON, CSV)
- Console and file logging
- SQLite database storage
- Real-time web interface
- RESTful API for log querying
- Configurable output paths
- TypeScript support

## Installation

```bash
bun add wlog
```

## Basic Usage

```typescript
import Wlog, { LogFormat } from "wlog";

// Create a logger instance
const logger = new Wlog({
  logToConsole: true,
  logToFile: true,
  filePath: "logs/app-logs",
  fileFormat: LogFormat.TEXT
});

// Log messages
logger.log("Regular log message");
logger.info("Information message");
logger.error("Error message");
```

## Configuration Options

```typescript
interface WlogConfig {
  logToConsole?: boolean;    // Default: false
  logToFile?: boolean;       // Default: false
  filePath?: string;         // Default: 'logs'
  fileFormat?: LogFormat;    // Default: LogFormat.TEXT
  serverOptions?: {
    enable?: boolean;        // Default: false
    port?: number;          // Default: 3000
    path?: string;          // Default: '/logs'
    livePath?: string;      // Default: '/live'
  };
}
```

## Output Formats

### Text Format
```
[2024-01-01 12:00:00] [INFO] This is a text log
```

### JSON Format
```json
[
  {
    "timestamp": "2024-01-01 12:00:00",
    "level": "INFO",
    "message": "This is a JSON log"
  }
]
```

### CSV Format
```csv
timestamp,level,message
2024-01-01 12:00:00,INFO,This is a CSV log
```

## Web Interface

Enable the web interface by setting `serverOptions.enable` to `true`:

```typescript
const logger = new Wlog({
  serverOptions: {
    enable: true,
    port: 3000
  }
});
```

- Access logs API: `http://localhost:3000/logs`
- Live web interface: `http://localhost:3000/live`

### API Query Parameters

- `startDate`: Filter logs from this date
- `endDate`: Filter logs until this date
- `level`: Filter by log level
- `limit`: Maximum number of logs
- `offset`: Number of logs to skip
- `order`: Sort order ('ASC' or 'DESC')

Example: `http://localhost:3000/logs?level=error&limit=10&order=DESC`

## License

MIT
