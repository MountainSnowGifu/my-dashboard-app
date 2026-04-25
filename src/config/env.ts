interface EnvConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

export const env: EnvConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081",
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8081",
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
