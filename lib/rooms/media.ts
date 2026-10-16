import "server-only";

/** Mic and camera use Agora. Without both values, rooms still work: timer, music and chat. */
export function mediaConfigured() {
  return !!(process.env.AGORA_APP_ID && process.env.AGORA_APP_CERTIFICATE);
}
