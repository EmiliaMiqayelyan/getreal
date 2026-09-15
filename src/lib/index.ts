/**
 * Library utilities and third-party integrations.
 * Env helpers and client wrappers belong here.
 */

export {
  DEMO_CREDENTIALS,
  IDLE_TIMEOUT_MS,
  isAuthenticated,
  login,
  logout,
  touchActivity,
  getSessionUserName,
} from "./auth";
export { env } from "./env";
export * from "./api";
