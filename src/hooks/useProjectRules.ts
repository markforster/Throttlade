import React from "react";

import type { Rule, Project } from "./../types";

const RULES_KEY = "rules"; // legacy compatibility

export function useProjectRules() {
  const [rules, setRules] = React.useState<Rule[]>([]);
  const [projectId, setProjectId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const { projects, currentProjectId } = await chrome.storage.sync.get([
      "projects",
      "currentProjectId",
    ] as any);
    const list: Project[] = Array.isArray(projects) ? (projects as Project[]) : [];
    const selected: Project | undefined =
      typeof currentProjectId === "string"
        ? list.find((p) => p && p.id === currentProjectId)
        : list[0];
    setProjectId(selected?.id ?? null);
    setRules(selected?.rules ?? []);
  }, []);

  React.useEffect(() => {
    refresh();
    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "sync") return;
      if (changes.projects || changes.currentProjectId) refresh();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh]);

  const save = async (next: Rule[]) => {
    const { projects, currentProjectId } = await chrome.storage.sync.get([
      "projects",
      "currentProjectId",
    ] as any);
    const list: Project[] = Array.isArray(projects) ? (projects as Project[]) : [];
    const currentId: string | undefined =
      typeof currentProjectId === "string" ? currentProjectId : list[0]?.id;
    if (!currentId) return;
    const merged = list.map((p) => (p.id === currentId ? { ...p, rules: next } : p));
    // Keep legacy `rules` in sync for backward compatibility (safe to remove later)
    await chrome.storage.sync.set({ projects: merged, [RULES_KEY]: next });
    setRules(next);
  };

  return { rules, save, projectId };
}
