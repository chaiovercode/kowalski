import { spawn, spawnSync, execSync } from "child_process";

export interface TerminalEnvironment {
  inTmux: boolean;
  summary: string;
}

export function detectTerminal(): TerminalEnvironment {
  const inTmux = !!process.env.TMUX;
  const summary = inTmux ? "tmux" : "no tmux";
  return { inTmux, summary };
}

export interface SpawnResult {
  method: string;
  pid?: number;
}

export interface SpawnOptions {
  socketPath?: string;
  scenario?: string;
}

export async function spawnCanvas(
  kind: string,
  id: string,
  configJson?: string,
  options?: SpawnOptions
): Promise<SpawnResult> {
  const env = detectTerminal();

  // Get the directory of this script (skill directory)
  const scriptDir = import.meta.dir.replace("/src", "");
  const runScript = `${scriptDir}/run-canvas.sh`;

  // Auto-generate socket path for IPC if not provided
  const socketPath = options?.socketPath || `/tmp/canvas-${id}.sock`;

  // Build the command to run
  let command = `${runScript} show ${kind} --id ${id}`;
  if (configJson) {
    // Write config to a temp file to avoid shell escaping issues
    const configFile = `/tmp/canvas-config-${id}.json`;
    await Bun.write(configFile, configJson);
    command += ` --config "$(cat ${configFile})"`;
  }
  command += ` --socket ${socketPath}`;
  if (options?.scenario) {
    command += ` --scenario ${options.scenario}`;
  }

  // If in tmux, use split pane (best experience)
  if (env.inTmux) {
    const result = await spawnTmux(command);
    if (result) return { method: "tmux" };
    throw new Error("Failed to spawn tmux pane");
  }

  // Not in tmux - auto-start tmux with canvas in a new terminal window
  console.log("\n💡 Tip: Run `tmux` then `claude` for split-pane view next time.\n");
  const result = await spawnWithAutoTmux(command, scriptDir);
  if (result) return { method: "auto-tmux" };

  throw new Error("Failed to spawn canvas. Please ensure tmux is installed.");
}

// File to track the canvas pane ID
const CANVAS_PANE_FILE = "/tmp/claude-canvas-pane-id";

async function getCanvasPaneId(): Promise<string | null> {
  try {
    const file = Bun.file(CANVAS_PANE_FILE);
    if (await file.exists()) {
      const paneId = (await file.text()).trim();
      // Verify the pane still exists by checking if tmux can find it
      const result = spawnSync("tmux", ["display-message", "-t", paneId, "-p", "#{pane_id}"]);
      const output = result.stdout?.toString().trim();
      // Pane exists only if command succeeds AND returns the same pane ID
      if (result.status === 0 && output === paneId) {
        return paneId;
      }
      // Stale pane reference - clean up the file
      await Bun.write(CANVAS_PANE_FILE, "");
    }
  } catch {
    // Ignore errors
  }
  return null;
}

async function saveCanvasPaneId(paneId: string): Promise<void> {
  await Bun.write(CANVAS_PANE_FILE, paneId);
}

async function createNewPane(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Use split-window -h for vertical split (side by side)
    // -p 75 gives canvas 3/4 width for better visualization space
    // -P -F prints the new pane ID so we can save it
    const args = ["split-window", "-h", "-p", "75", "-P", "-F", "#{pane_id}", command];
    const proc = spawn("tmux", args);
    let paneId = "";
    proc.stdout?.on("data", (data) => {
      paneId += data.toString();
    });
    proc.on("close", async (code) => {
      if (code === 0 && paneId.trim()) {
        await saveCanvasPaneId(paneId.trim());
      }
      resolve(code === 0);
    });
    proc.on("error", () => resolve(false));
  });
}

async function reuseExistingPane(paneId: string, command: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Send Ctrl+C to interrupt any running process
    const killProc = spawn("tmux", ["send-keys", "-t", paneId, "C-c"]);
    killProc.on("close", () => {
      // Wait for process to terminate before sending new command
      setTimeout(() => {
        // Clear the terminal and run the new command
        const args = ["send-keys", "-t", paneId, `clear && ${command}`, "Enter"];
        const proc = spawn("tmux", args);
        proc.on("close", (code) => resolve(code === 0));
        proc.on("error", () => resolve(false));
      }, 150);
    });
    killProc.on("error", () => resolve(false));
  });
}

async function spawnTmux(command: string): Promise<boolean> {
  // Check if we have an existing canvas pane to reuse
  const existingPaneId = await getCanvasPaneId();

  if (existingPaneId) {
    // Try to reuse existing pane
    const reused = await reuseExistingPane(existingPaneId, command);
    if (reused) {
      return true;
    }
    // Reuse failed (pane may have been closed) - clear stale reference and create new
    await Bun.write(CANVAS_PANE_FILE, "");
  }

  // Create a new split pane
  return createNewPane(command);
}

/**
 * Auto-start tmux with canvas when not already in tmux.
 * Opens a new terminal window with tmux running the canvas.
 */
async function spawnWithAutoTmux(command: string, scriptDir: string): Promise<boolean> {
  // Check if tmux is installed
  try {
    execSync("which tmux", { stdio: "ignore" });
  } catch {
    console.error("tmux is not installed. Please install tmux: brew install tmux");
    return false;
  }

  const platform = process.platform;
  const sessionName = `kowalski-canvas-${Date.now()}`;

  if (platform === "darwin") {
    // macOS - try iTerm2 first, fall back to Terminal.app
    return spawnMacOSTerminal(command, sessionName);
  } else {
    // Linux - try common terminal emulators
    return spawnLinuxTerminal(command, sessionName);
  }
}

async function spawnMacOSTerminal(command: string, sessionName: string): Promise<boolean> {
  const tmuxCommand = `tmux new-session -s '${sessionName}' '${command.replace(/'/g, "'\\''")}'`;

  // Try iTerm2 first (excellent scripting support)
  if (await appExists("com.googlecode.iterm2")) {
    const result = await spawnITerm(tmuxCommand);
    if (result) return true;
  }

  // Try Ghostty (checks CLI in app bundle, falls back to AppleScript)
  if (await appExists("com.mitchellh.ghostty")) {
    const result = await spawnGhostty(tmuxCommand);
    if (result) return true;
  }

  // Fallback to Terminal.app (always available)
  return spawnTerminalApp(tmuxCommand);
}

async function appExists(bundleId: string): Promise<boolean> {
  try {
    const result = execSync(`mdfind "kMDItemCFBundleIdentifier == '${bundleId}'" 2>/dev/null | head -1`, { encoding: "utf-8" });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

async function spawnGhostty(tmuxCommand: string): Promise<boolean> {
  return new Promise(async (resolve) => {
    // Write command to a temp script for reliability
    const scriptPath = `/tmp/kowalski-startup-${Date.now()}.sh`;
    await Bun.write(scriptPath, `#!/bin/bash\n${tmuxCommand}\n`);
    execSync(`chmod +x ${scriptPath}`);

    // Try ghostty CLI - check PATH first, then app bundle
    const ghosttyPaths = [
      "ghostty",  // In PATH
      "/Applications/Ghostty.app/Contents/MacOS/ghostty",  // App bundle
    ];

    for (const ghosttyPath of ghosttyPaths) {
      try {
        // Check if this path exists/works
        if (ghosttyPath === "ghostty") {
          execSync("which ghostty", { stdio: "ignore" });
        } else {
          execSync(`test -x "${ghosttyPath}"`, { stdio: "ignore" });
        }

        const proc = spawn(ghosttyPath, ["-e", "/bin/bash", "-c", `${scriptPath}; exec bash`], {
          detached: true,
          stdio: "ignore",
        });
        proc.unref();
        setTimeout(() => resolve(true), 500);
        return;
      } catch {
        // Try next path
      }
    }

    // Fallback: AppleScript with keystroke (requires accessibility permissions)
    const escapedPath = scriptPath.replace(/'/g, "'\\''");
    const script = `
      tell application "Ghostty"
        activate
      end tell
      delay 1.0
      tell application "System Events"
        tell process "Ghostty"
          keystroke "/bin/bash '${escapedPath}'"
          keystroke return
        end tell
      end tell
    `;
    const proc = spawn("osascript", ["-e", script]);
    proc.on("close", (code) => {
      setTimeout(() => resolve(code === 0), 500);
    });
    proc.on("error", () => resolve(false));
  });
}

async function spawnITerm(tmuxCommand: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = `
      tell application "iTerm"
        activate
        create window with default profile
        tell current session of current window
          write text "${tmuxCommand.replace(/"/g, '\\"')}"
        end tell
      end tell
    `;
    const proc = spawn("osascript", ["-e", script]);
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

async function spawnTerminalApp(tmuxCommand: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("osascript", [
      "-e", `tell application "Terminal"`,
      "-e", `activate`,
      "-e", `do script "${tmuxCommand.replace(/"/g, '\\"')}"`,
      "-e", `end tell`
    ]);
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

async function spawnLinuxTerminal(command: string, sessionName: string): Promise<boolean> {
  const tmuxCommand = `tmux new-session -s '${sessionName}' '${command.replace(/'/g, "'\\''")}'`;

  // Try common terminal emulators in order of preference
  const terminals = [
    { cmd: "gnome-terminal", args: ["--", "bash", "-c", tmuxCommand] },
    { cmd: "konsole", args: ["-e", "bash", "-c", tmuxCommand] },
    { cmd: "xfce4-terminal", args: ["-e", tmuxCommand] },
    { cmd: "xterm", args: ["-e", tmuxCommand] },
  ];

  for (const term of terminals) {
    try {
      execSync(`which ${term.cmd}`, { stdio: "ignore" });
      return new Promise((resolve) => {
        const proc = spawn(term.cmd, term.args, { detached: true, stdio: "ignore" });
        proc.unref();
        // Give it a moment to start
        setTimeout(() => resolve(true), 500);
      });
    } catch {
      // Terminal not found, try next
    }
  }

  console.error("No supported terminal emulator found. Please run inside tmux.");
  return false;
}

