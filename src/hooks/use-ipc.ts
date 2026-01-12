// IPC hook for canvas-side communication with controller

import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "ink";
import { connectWithRetry, type IPCClient } from "../ipc/client";
import type { CanvasMessage, ControllerMessage, ViewState, HighlightTarget, DataFilter, DrilldownContext, ExportOptions } from "../ipc/types";

export interface UseIPCOptions {
  socketPath: string | undefined;
  scenario: string;
  onClose?: () => void;
  onUpdate?: (config: unknown) => void;
  onGetViewState?: () => ViewState | null;        // Called when controller requests view state
  onHighlight?: (target: HighlightTarget) => void; // Called when controller wants to highlight
  onClearHighlights?: () => void;                  // Called to clear all highlights
  onFocus?: (element: string) => void;             // Called to scroll element into view
  // Phase 6: Interactive features
  onApplyFilter?: (filter: DataFilter) => void;   // Called when controller applies a filter
  onClearFilters?: () => void;                    // Called to clear all filters
  onDrilldown?: (context: DrilldownContext) => void; // Called for drilldown
  onSwitchChart?: (chartType: string) => void;    // Called to switch chart type
  onExport?: (options: ExportOptions) => void;    // Called for export
  onAnswerQuestion?: (id: string, answer: string) => void; // Called when controller answers a question
}

export interface IPCHandle {
  isConnected: boolean;
  sendReady: () => void;
  sendSelected: (data: unknown) => void;
  sendCancelled: (reason?: string) => void;
  sendError: (message: string) => void;
  sendViewState: (state: ViewState) => void;       // Send current view state to controller
}

export function useIPC(options: UseIPCOptions): IPCHandle {
  const {
    socketPath,
    scenario,
    onClose,
    onUpdate,
    onGetViewState,
    onHighlight,
    onClearHighlights,
    onFocus,
    onApplyFilter,
    onClearFilters,
    onDrilldown,
    onSwitchChart,
    onExport,
    onAnswerQuestion,
  } = options;
  const { exit } = useApp();
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<IPCClient | null>(null);
  const onCloseRef = useRef(onClose);
  const onUpdateRef = useRef(onUpdate);
  const onGetViewStateRef = useRef(onGetViewState);
  const onHighlightRef = useRef(onHighlight);
  const onClearHighlightsRef = useRef(onClearHighlights);
  const onFocusRef = useRef(onFocus);
  const onApplyFilterRef = useRef(onApplyFilter);
  const onClearFiltersRef = useRef(onClearFilters);
  const onDrilldownRef = useRef(onDrilldown);
  const onSwitchChartRef = useRef(onSwitchChart);
  const onExportRef = useRef(onExport);
  const onAnswerQuestionRef = useRef(onAnswerQuestion);

  useEffect(() => {
    onCloseRef.current = onClose;
    onUpdateRef.current = onUpdate;
    onGetViewStateRef.current = onGetViewState;
    onHighlightRef.current = onHighlight;
    onClearHighlightsRef.current = onClearHighlights;
    onFocusRef.current = onFocus;
    onApplyFilterRef.current = onApplyFilter;
    onClearFiltersRef.current = onClearFilters;
    onDrilldownRef.current = onDrilldown;
    onSwitchChartRef.current = onSwitchChart;
    onExportRef.current = onExport;
    onAnswerQuestionRef.current = onAnswerQuestion;
  }, [onClose, onUpdate, onGetViewState, onHighlight, onClearHighlights, onFocus, onApplyFilter, onClearFilters, onDrilldown, onSwitchChart, onExport, onAnswerQuestion]);

  // Connect to controller on mount
  useEffect(() => {
    if (!socketPath) return;

    let mounted = true;

    const connect = async () => {
      try {
        const client = await connectWithRetry({
          socketPath,
          onMessage: (msg: ControllerMessage) => {
            switch (msg.type) {
              case "close":
                onCloseRef.current?.();
                exit();
                break;
              case "update":
                onUpdateRef.current?.(msg.config);
                break;
              case "ping":
                client.send({ type: "pong" });
                break;
              case "getViewState": {
                const viewState = onGetViewStateRef.current?.();
                if (viewState) {
                  client.send({ type: "viewState", data: viewState });
                }
                break;
              }
              case "highlight":
                onHighlightRef.current?.(msg.target);
                break;
              case "clearHighlights":
                onClearHighlightsRef.current?.();
                break;
              case "focus":
                onFocusRef.current?.(msg.element);
                break;
              // Phase 6: Interactive features
              case "applyFilter":
                onApplyFilterRef.current?.(msg.filter);
                break;
              case "clearFilters":
                onClearFiltersRef.current?.();
                break;
              case "drilldown":
                onDrilldownRef.current?.(msg.context);
                break;
              case "switchChart":
                onSwitchChartRef.current?.(msg.chartType);
                break;
              case "export":
                onExportRef.current?.(msg.options);
                break;
              case "answerQuestion":
                onAnswerQuestionRef.current?.(msg.id, msg.answer);
                break;
            }
          },
          onDisconnect: () => {
            if (mounted) {
              setIsConnected(false);
            }
          },
          onError: (err) => {
            console.error("IPC error:", err);
          },
        });

        if (mounted) {
          clientRef.current = client;
          setIsConnected(true);
          // Send ready message automatically
          client.send({ type: "ready", scenario });
        } else {
          client.close();
        }
      } catch (err) {
        console.error("Failed to connect to controller:", err);
      }
    };

    connect();

    return () => {
      mounted = false;
      clientRef.current?.close();
      clientRef.current = null;
    };
  }, [socketPath, scenario, exit]);

  const sendReady = useCallback(() => {
    clientRef.current?.send({ type: "ready", scenario });
  }, [scenario]);

  const sendSelected = useCallback((data: unknown) => {
    clientRef.current?.send({ type: "selected", data });
  }, []);

  const sendCancelled = useCallback((reason?: string) => {
    clientRef.current?.send({ type: "cancelled", reason });
  }, []);

  const sendError = useCallback((message: string) => {
    clientRef.current?.send({ type: "error", message });
  }, []);

  const sendViewState = useCallback((state: ViewState) => {
    clientRef.current?.send({ type: "viewState", data: state });
  }, []);

  return {
    isConnected,
    sendReady,
    sendSelected,
    sendCancelled,
    sendError,
    sendViewState,
  };
}
