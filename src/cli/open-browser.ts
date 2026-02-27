// Cross-platform browser opener (WSL2, macOS, Linux)

import { readFileSync } from "fs";

/** Detect if running inside WSL2. */
function isWSL(): boolean {
  try {
    const version = readFileSync("/proc/version", "utf-8");
    return /microsoft|wsl/i.test(version);
  } catch {
    return false;
  }
}

/** Open a URL in the default browser. */
export async function openBrowser(url: string): Promise<void> {
  let cmd: string[];

  if (isWSL()) {
    // WSL2: use cmd.exe to open the browser on the Windows host
    cmd = ["cmd.exe", "/c", "start", url.replace(/&/g, "^&")];
  } else if (process.platform === "darwin") {
    cmd = ["open", url];
  } else {
    // Linux / other Unix
    cmd = ["xdg-open", url];
  }

  try {
    const proc = Bun.spawn(cmd, {
      stdout: "ignore",
      stderr: "ignore",
    });
    await proc.exited;
  } catch {
    console.error(`Could not open browser. Visit ${url} manually.`);
  }
}
