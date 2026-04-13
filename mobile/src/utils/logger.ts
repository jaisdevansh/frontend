const logs: string[] = [];
const MAX_LOGS = __DEV__ ? 100 : 50; // More logs in dev, less in production

export const log = (...args: any[]) => {
  // Skip logging in production for performance
  if (!__DEV__) return;
  
  const message = args
    .map(a => (typeof a === "object" ? JSON.stringify(a) : String(a)))
    .join(" ");

  logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);

  if (logs.length > MAX_LOGS) logs.shift(); // limit memory

  console.log(message);
};

export const getLogs = () => logs;
