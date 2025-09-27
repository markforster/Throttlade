import React from "react";
import { Project } from "../types";

export function useProjectSelector() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [currentId, setCurrentId] = React.useState<string>("");
  const [currentEnabled, setCurrentEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    const read = async () => {
      const { projects, currentProjectId } = await chrome.storage.sync.get([
        "projects",
        "currentProjectId",
      ] as any);
      const list: Project[] = Array.isArray(projects) ? (projects as Project[]) : [];
      setProjects(list);
      const selected: Project | undefined =
        typeof currentProjectId === "string"
          ? list.find((p) => p && p.id === currentProjectId)
          : list[0];
      const id: string = selected?.id ?? "";
      setCurrentId(id);
      setCurrentEnabled(selected?.enabled ?? true);
    };
    read();
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== "sync") return;
      if (changes.projects || changes.currentProjectId) read();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const select = (id: string) => {
    setCurrentId(id);
    if (id) chrome.storage.sync.set({ currentProjectId: id });
  };

  React.useEffect(() => {
    const selected = projects.find((p) => p.id === currentId);
    setCurrentEnabled(selected?.enabled ?? true);
  }, [projects, currentId]);

  return { projects, currentId, currentEnabled, select };
}
