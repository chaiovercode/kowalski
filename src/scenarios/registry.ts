// Scenario Registry - Central lookup for all scenarios

import type { ScenarioDefinition } from "./types";

// Registry of all scenarios keyed by "canvasKind:scenarioName"
const registry = new Map<string, ScenarioDefinition>();

// Analytics scenarios are handled directly in the canvas component

export function getScenario(
  canvasKind: string,
  scenarioName: string
): ScenarioDefinition | undefined {
  return registry.get(`${canvasKind}:${scenarioName}`);
}

export function listScenarios(canvasKind?: string): ScenarioDefinition[] {
  const scenarios: ScenarioDefinition[] = [];
  for (const [key, scenario] of registry) {
    if (!canvasKind || key.startsWith(`${canvasKind}:`)) {
      scenarios.push(scenario);
    }
  }
  return scenarios;
}

export function registerScenario(scenario: ScenarioDefinition): void {
  registry.set(`${scenario.canvasKind}:${scenario.name}`, scenario);
}
