// Cross-platform browser opener (WSL1/2, macOS, Linux, Windows native)

/** Linux opener fallback chain. */
const LINUX_OPENERS = ["xdg-open", "sensible-browser", "x-www-browser"];

/**
 * Find the command to open a URL in the default browser.
 * Returns the command array or null if no opener is available.
 */
function findOpener(url: string): string[] | null {
  const platform = process.platform;

  // WSL (1 & 2): explorer.exe is available via Windows interop
  if (platform === "linux" && Bun.which("explorer.exe")) {
    return ["explorer.exe", url];
  }

  if (platform === "darwin") {
    return ["open", url];
  }

  if (platform === "win32") {
    // MSYS, Cygwin, Git Bash, native Windows
    return ["cmd.exe", "/c", "start", "", url.replace(/&/g, "^&")];
  }

  if (platform === "linux") {
    // $BROWSER takes priority (standard convention)
    const browserEnv = process.env.BROWSER;
    if (browserEnv && Bun.which(browserEnv)) {
      return [browserEnv, url];
    }

    // Fallback chain
    for (const opener of LINUX_OPENERS) {
      if (Bun.which(opener)) {
        return [opener, url];
      }
    }
  }

  return null;
}

/** Open a URL in the default browser. */
export async function openBrowser(url: string): Promise<void> {
  const cmd = findOpener(url);

  if (!cmd) {
    console.error(`Could not detect a browser opener. Visit ${url} manually.`);
    return;
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
