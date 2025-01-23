import Wlog, { LogFormat } from "./wlog";

// Text format logger
const textLogger = new Wlog({
  logToConsole: true,
  logToFile: true,
  filePath: "logs/text-logs",
  fileFormat: LogFormat.TEXT,
  serverOptions: {
    enable: true,
  }
});

// JSON format logger
const jsonLogger = new Wlog({
  logToConsole: false,
  logToFile: true,
  filePath: "logs/json-logs",
  fileFormat: LogFormat.JSON,
});

// CSV format logger
const csvLogger = new Wlog({
  logToConsole: false,
  logToFile: true,
  filePath: "logs/csv-logs",
  fileFormat: LogFormat.CSV,
});

// Test different formats
textLogger.log("This is a text log");
jsonLogger.info("This is a JSON log");
csvLogger.error("This is a CSV log");

setInterval(() => {
  textLogger.log("This is a text log");
}, 3000);
