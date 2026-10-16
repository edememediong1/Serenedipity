import { cacheLife } from "next/cache";

/** Cached so the static shell can include it; refreshes daily. */
export async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
