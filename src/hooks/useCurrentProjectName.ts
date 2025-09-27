import React from "react";

export function useCurrentProjectName() {
  const [name, setName] = React.useState<string>("Default");
  React.useEffect(() => {
    const compute = async () => {
      const { projects, currentProjectId } = await chrome.storage.sync.get([
        "projects",
        "currentProjectId",
      ] as any);
      const list = Array.isArray(projects) ? projects as any[] : [];
      const current = typeof currentProjectId === "string"
        ? list.find(p => p && p.id === currentProjectId)
        : list[0];
      setName(current?.name || (list.length ? "(Unnamed project)" : "Default"));
    };
    compute();
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== "sync") return;
      if (changes.projects || changes.currentProjectId) compute();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);
  return name;
}