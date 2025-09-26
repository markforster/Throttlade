import type { AppState, Project, Rule } from "./types";

const SCHEMA_VERSION = 1;

type LegacyShape = {
  rules?: Rule[];
  enabled?: boolean;
  projects?: Project[];
  currentProjectId?: string | null;
  globalEnabled?: boolean;
  schemaVersion?: number;
};

export async function ensureSchemaMigration(): Promise<void> {
  const data = (await chrome.storage.sync.get([
    "schemaVersion",
    "rules",
    "enabled",
    "projects",
    "currentProjectId",
    "globalEnabled",
  ])) as LegacyShape;

  const version = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;
  if (version >= SCHEMA_VERSION) return; // already migrated

  // If projects already exist, just stamp the version and keep going.
  if (Array.isArray(data.projects) && data.projects.length > 0) {
    await chrome.storage.sync.set({ schemaVersion: SCHEMA_VERSION });
    return;
  }

  // Create a default project from legacy state (if any)
  const legacyRules = Array.isArray(data.rules) ? data.rules : [];
  const globalEnabled = typeof data.enabled === "boolean" ? data.enabled : true;

  const defaultProject: Project = {
    id: crypto.randomUUID(),
    name: "Default",
    enabled: true,
    rules: legacyRules,
  };

  const newState: Partial<AppState> & { schemaVersion: number } = {
    schemaVersion: SCHEMA_VERSION,
    globalEnabled,
    projects: [defaultProject],
    currentProjectId: defaultProject.id,
  };

  // Important for backward compatibility: keep legacy keys in sync so
  // existing UI/patchers continue to function unchanged.
  await chrome.storage.sync.set({
    ...newState,
    rules: legacyRules,
    enabled: globalEnabled,
  });
}

