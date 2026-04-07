const logs: string[] = [];

export const log = (...args: any[]) => {
  const message = args
    .map(a => (typeof a === "object" ? JSON.stringify(a) : String(a)))
    .join(" ");

  logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);

  if (logs.length > 50) logs.shift(); // limit memory

  console.log(message); // dev fallback
};

export const getLogs = () => logs;
