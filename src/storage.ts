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

// ---------- Typed storage helpers (non-disruptive) ----------

export async function getState(): Promise<AppState> {
  const data = await chrome.storage.sync.get([
    "schemaVersion",
    "globalEnabled",
    "projects",
    "currentProjectId",
  ]);

  const schemaVersion = typeof data.schemaVersion === "number" ? data.schemaVersion : SCHEMA_VERSION;
  const globalEnabled = typeof data.globalEnabled === "boolean" ? data.globalEnabled : true;
  const projects: Project[] = Array.isArray(data.projects) ? data.projects : [];
  const currentProjectId: string | null = typeof data.currentProjectId === "string" ? data.currentProjectId : (projects[0]?.id ?? null);

  return { schemaVersion, globalEnabled, projects, currentProjectId };
}

export async function setState(partial: Partial<AppState>): Promise<void> {
  await chrome.storage.sync.set(partial);
}

export type EffectiveState = {
  projectId: string | null;
  rules: Rule[];
  effectiveEnabled: boolean;
};

export async function getEffectiveState(): Promise<EffectiveState> {
  const state = await getState();
  const selected = state.projects.find(p => p.id === state.currentProjectId) ?? state.projects[0];
  const projectId = selected?.id ?? null;
  const rules = selected?.rules ?? [];
  const effectiveEnabled = Boolean(state.globalEnabled && (selected ? selected.enabled : true));
  return { projectId, rules, effectiveEnabled };
}

// Ensure currentProjectId points to an existing project. If not, repair it and
// return true when a write occurred. Also ensures at least one default project
// exists if the list is empty (defensive guard).
export async function repairCurrentProjectId(): Promise<boolean> {
  const data = await chrome.storage.sync.get(["projects", "currentProjectId"]) as {
    projects?: Project[];
    currentProjectId?: string;
  };
  let list: Project[] = Array.isArray(data.projects) ? data.projects as Project[] : [];

  // If no projects, create a default one
  if (list.length === 0) {
    const def: Project = { id: crypto.randomUUID(), name: "Default", enabled: true, rules: [] };
    list = [def];
    await chrome.storage.sync.set({ projects: list, currentProjectId: def.id });
    return true;
  }

  const has = typeof data.currentProjectId === "string" && list.some(p => p.id === data.currentProjectId);
  if (has) return false;

  const newId = list[0].id;
  await chrome.storage.sync.set({ currentProjectId: newId });
  return true;
}
