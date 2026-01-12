// Kowalski Analytics Skill
// "Kowalski, analysis!" - Data analysis with military precision

export * from "./types";
export * from "./personality";
export * from "./handler";
export * from "./commands";

import { kowalskiHandler } from "./handler";

/**
 * Skill definition for Claude Code integration
 */
export const kowalskiSkill = {
  name: "kowalski",
  description: "Kowalski Analytics - Data analysis with military precision",
  command: "/kowalski",
  handler: kowalskiHandler,
};

export default kowalskiSkill;
