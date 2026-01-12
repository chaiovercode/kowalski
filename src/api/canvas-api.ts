// High-Level Canvas API for Claude
// Provides simple async interface for spawning interactive canvases

import { createIPCServer, type IPCServer } from "../ipc/server";
import { getSocketPath, type ViewState, type HighlightTarget } from "../ipc/types";
import { spawnCanvas } from "../terminal";
import type { CanvasMessage } from "../ipc/types";
import type {
  MeetingPickerConfig,
  MeetingPickerResult,
  DocumentConfig,
  DocumentSelection,
} from "../scenarios/types";

export interface CanvasResult<T = unknown> {
  success: boolean;
  data?: T;
  cancelled?: boolean;
  error?: string;
}

export interface SpawnOptions {
  timeout?: number; // ms, default 5 minutes
  onReady?: () => void;
  onViewState?: (viewState: ViewState) => void;  // Called when canvas reports view state
}

// ============================================
// Interactive Canvas Session
// ============================================

/**
 * Handle for an active canvas session
 * Allows Claude to interact with the canvas bidirectionally
 */
export interface CanvasSession {
  /** Current view state from the canvas */
  viewState: ViewState | null;

  /** Request the current view state from canvas */
  getViewState(): Promise<ViewState | null>;

  /** Highlight a specific element */
  highlight(target: HighlightTarget): void;

  /** Clear all highlights */
  clearHighlights(): void;

  /** Scroll an element into view */
  focus(element: string): void;

  /** Send updated config to canvas */
  update(config: unknown): void;

  /** Close the canvas session */
  close(): void;

  /** Wait for user selection (resolves when user interacts) */
  waitForSelection<T>(): Promise<CanvasResult<T>>;
}

/**
 * Spawn an interactive canvas and wait for user selection
 */
export async function spawnCanvasWithIPC<TConfig, TResult>(
  kind: string,
  scenario: string,
  config: TConfig,
  options: SpawnOptions = {}
): Promise<CanvasResult<TResult>> {
  const { timeout = 300000, onReady, onViewState } = options;
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const socketPath = getSocketPath(id);

  let resolved = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let server: IPCServer;

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    server?.close();
  };

  return new Promise(async (resolve) => {
    try {
      server = await createIPCServer({
        socketPath,
        onClientConnect() {
          // Canvas connected, waiting for ready message
        },
        onMessage(msg: CanvasMessage) {
          if (resolved) return;

          switch (msg.type) {
            case "ready":
              onReady?.();
              break;

            case "viewState":
              // Canvas is reporting its current view state
              onViewState?.(msg.data);
              break;

            case "selected":
              resolved = true;
              cleanup();
              resolve({
                success: true,
                data: msg.data as TResult,
              });
              break;

            case "cancelled":
              resolved = true;
              cleanup();
              resolve({
                success: true,
                cancelled: true,
              });
              break;

            case "error":
              resolved = true;
              cleanup();
              resolve({
                success: false,
                error: msg.message,
              });
              break;

            case "pong":
              // Response to ping, ignore
              break;
          }
        },
        onClientDisconnect() {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              success: false,
              error: "Canvas disconnected unexpectedly",
            });
          }
        },
        onError(error) {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              success: false,
              error: error.message,
            });
          }
        },
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          server.broadcast({ type: "close" });
          cleanup();
          resolve({
            success: false,
            error: "Timeout waiting for user selection",
          });
        }
      }, timeout);

      // Spawn the canvas
      spawnCanvas(kind, id, JSON.stringify(config), {
        socketPath,
        scenario,
      }).catch((err) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            error: `Failed to spawn canvas: ${err.message}`,
          });
        }
      });
    } catch (err) {
      resolve({
        success: false,
        error: `Failed to create IPC server: ${(err as Error).message}`,
      });
    }
  });
}

/**
 * Create an interactive canvas session for bidirectional communication
 * This is the recommended API for conversational analytics
 */
export async function createCanvasSession<TConfig>(
  kind: string,
  scenario: string,
  config: TConfig,
  options: SpawnOptions = {}
): Promise<CanvasSession> {
  const { timeout = 300000, onReady, onViewState } = options;
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const socketPath = getSocketPath(id);

  let currentViewState: ViewState | null = null;
  let viewStateResolvers: Array<(state: ViewState | null) => void> = [];
  let selectionResolvers: Array<{ resolve: (result: CanvasResult<unknown>) => void }> = [];
  let isConnected = false;
  let server: IPCServer;
  let sessionCreated = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Define session early so it can be referenced in callbacks
  let session: CanvasSession;

  return new Promise(async (resolveSession, rejectSession) => {
    try {
      server = await createIPCServer({
        socketPath,
        onClientConnect() {
          isConnected = true;
        },
        onMessage(msg: CanvasMessage) {
          switch (msg.type) {
            case "ready":
              if (!sessionCreated) {
                sessionCreated = true;
                if (timeoutId) {
                  clearTimeout(timeoutId);
                  timeoutId = null;
                }
                onReady?.();
                resolveSession(session);
              }
              break;

            case "viewState":
              currentViewState = msg.data;
              onViewState?.(msg.data);
              // Resolve any pending getViewState() calls
              viewStateResolvers.forEach(resolve => resolve(msg.data));
              viewStateResolvers = [];
              break;

            case "selected":
              // Resolve any pending waitForSelection() calls
              selectionResolvers.forEach(({ resolve }) => {
                resolve({ success: true, data: msg.data });
              });
              selectionResolvers = [];
              break;

            case "cancelled":
              selectionResolvers.forEach(({ resolve }) => {
                resolve({ success: true, cancelled: true });
              });
              selectionResolvers = [];
              break;

            case "error":
              selectionResolvers.forEach(({ resolve }) => {
                resolve({ success: false, error: msg.message });
              });
              selectionResolvers = [];
              break;

            case "pong":
              break;
          }
        },
        onClientDisconnect() {
          isConnected = false;
          // Reject any pending operations
          viewStateResolvers.forEach(resolve => resolve(null));
          viewStateResolvers = [];
          selectionResolvers.forEach(({ resolve }) => {
            resolve({ success: false, error: "Canvas disconnected" });
          });
          selectionResolvers = [];
        },
        onError(error) {
          if (!sessionCreated) {
            rejectSession(error);
          }
        },
      });

      // Set initial timeout for session creation
      timeoutId = setTimeout(() => {
        if (!sessionCreated) {
          server.close();
          rejectSession(new Error("Timeout waiting for canvas to connect"));
        }
      }, timeout);

      // The session object
      session = {
        get viewState() {
          return currentViewState;
        },

        async getViewState() {
          if (!isConnected) return null;
          server.broadcast({ type: "getViewState" });
          return new Promise<ViewState | null>((resolve) => {
            viewStateResolvers.push(resolve);
            // Timeout after 5 seconds
            setTimeout(() => {
              const idx = viewStateResolvers.indexOf(resolve);
              if (idx >= 0) {
                viewStateResolvers.splice(idx, 1);
                resolve(currentViewState); // Return cached state
              }
            }, 5000);
          });
        },

        highlight(target: HighlightTarget) {
          if (isConnected) {
            server.broadcast({ type: "highlight", target });
          }
        },

        clearHighlights() {
          if (isConnected) {
            server.broadcast({ type: "clearHighlights" });
          }
        },

        focus(element: string) {
          if (isConnected) {
            server.broadcast({ type: "focus", element });
          }
        },

        update(newConfig: unknown) {
          if (isConnected) {
            server.broadcast({ type: "update", config: newConfig });
          }
        },

        close() {
          server.broadcast({ type: "close" });
          server.close();
          isConnected = false;
        },

        waitForSelection<T>() {
          return new Promise<CanvasResult<T>>((resolve) => {
            selectionResolvers.push({ resolve: resolve as (result: CanvasResult<unknown>) => void });
          });
        },
      };

      // Spawn the canvas
      spawnCanvas(kind, id, JSON.stringify(config), {
        socketPath,
        scenario,
      }).catch((err) => {
        if (!sessionCreated) {
          server.close();
          rejectSession(err);
        }
      });
    } catch (err) {
      rejectSession(err);
    }
  });
}

/**
 * Spawn a meeting picker canvas
 * Convenience wrapper for the meeting-picker scenario
 */
export async function pickMeetingTime(
  config: MeetingPickerConfig,
  options?: SpawnOptions
): Promise<CanvasResult<MeetingPickerResult>> {
  return spawnCanvasWithIPC<MeetingPickerConfig, MeetingPickerResult>(
    "calendar",
    "meeting-picker",
    config,
    options
  );
}

/**
 * Display a calendar (non-interactive)
 * Convenience wrapper for the display scenario
 */
export async function displayCalendar(
  config: {
    title?: string;
    events?: Array<{
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      color?: string;
      allDay?: boolean;
    }>;
  },
  options?: SpawnOptions
): Promise<CanvasResult<void>> {
  return spawnCanvasWithIPC("calendar", "display", config, options);
}

// ============================================
// Document Canvas API
// ============================================

/**
 * Display a document (read-only view)
 * Shows markdown-rendered content with optional diff highlighting
 */
export async function displayDocument(
  config: DocumentConfig,
  options?: SpawnOptions
): Promise<CanvasResult<void>> {
  return spawnCanvasWithIPC("document", "display", config, options);
}

/**
 * Open a document for editing/selection
 * Returns the selected text when user makes a selection via click-and-drag
 * Selection is sent automatically as the user selects text
 */
export async function editDocument(
  config: DocumentConfig,
  options?: SpawnOptions
): Promise<CanvasResult<DocumentSelection>> {
  return spawnCanvasWithIPC<DocumentConfig, DocumentSelection>(
    "document",
    "edit",
    config,
    options
  );
}

// ============================================
// Kowalski Analytics Canvas API
// ============================================

import type {
  AnalyticsConfig,
  AnalyticsResult,
} from "../canvases/analytics/types";

/**
 * Spawn analytics dashboard with full visualization
 * "Kowalski, analysis!"
 */
export async function spawnAnalytics(
  config: AnalyticsConfig,
  options?: SpawnOptions
): Promise<CanvasResult<AnalyticsResult>> {
  return spawnCanvasWithIPC<AnalyticsConfig, AnalyticsResult>(
    "analytics",
    "dashboard",
    config,
    options
  );
}

/**
 * Show analytics in chart viewer mode
 */
export async function showAnalyticsCharts(
  config: AnalyticsConfig,
  options?: SpawnOptions
): Promise<CanvasResult<AnalyticsResult>> {
  return spawnCanvasWithIPC<AnalyticsConfig, AnalyticsResult>(
    "analytics",
    "charts",
    config,
    options
  );
}

/**
 * Show analytics in data table mode
 */
export async function showAnalyticsData(
  config: AnalyticsConfig,
  options?: SpawnOptions
): Promise<CanvasResult<AnalyticsResult>> {
  return spawnCanvasWithIPC<AnalyticsConfig, AnalyticsResult>(
    "analytics",
    "data",
    config,
    options
  );
}

/**
 * Show analytics insights view
 */
export async function showAnalyticsInsights(
  config: AnalyticsConfig,
  options?: SpawnOptions
): Promise<CanvasResult<AnalyticsResult>> {
  return spawnCanvasWithIPC<AnalyticsConfig, AnalyticsResult>(
    "analytics",
    "insights",
    config,
    options
  );
}

/**
 * Create an interactive analytics session for conversational data exploration
 * This is the recommended API for Claude to use when discussing data with users
 *
 * Example:
 * ```typescript
 * const session = await createAnalyticsSession({
 *   title: "Sales Analysis",
 *   data: dataset,
 *   analysis: analysisResults,
 * });
 *
 * // Claude can now see what the user sees
 * const viewState = await session.getViewState();
 * console.log("User is looking at:", viewState?.phase, viewState?.insights);
 *
 * // Claude can highlight things
 * session.highlight({
 *   type: "column",
 *   id: "revenue",
 *   style: "pulse",
 *   duration: 2000,
 * });
 *
 * // When done
 * session.close();
 * ```
 */
export async function createAnalyticsSession(
  config: AnalyticsConfig,
  options?: SpawnOptions
): Promise<CanvasSession> {
  return createCanvasSession<AnalyticsConfig>(
    "analytics",
    "dashboard",
    config,
    options
  );
}

