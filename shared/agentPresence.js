/** How long since lastSeen before we treat a connected agent as gone (closed app / lost socket). */
export const LIVE_AGENT_PRESENCE_MS = 5 * 60 * 1000;

/** Browser workspace heartbeat interval while an agent is attached (keeps lastSeen fresh). */
export const AGENT_PRESENCE_HEARTBEAT_MS = 45 * 1000;
