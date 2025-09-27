import React from "react";

const ENABLED_KEY = "enabled"; // legacy/global toggle key used by older code
const GLOBAL_ENABLED_KEY = "globalEnabled"; // new schema key used by project model

export function useGlobalEnabled() {
  const [enabled, setEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;

    chrome.storage.sync
      .get([ENABLED_KEY, GLOBAL_ENABLED_KEY])
      .then(({ [ENABLED_KEY]: legacy, [GLOBAL_ENABLED_KEY]: global }) => {
        if (!mounted) return;
        // Prefer new schema key when present, otherwise fall back to legacy
        const val = (typeof global === "boolean") ? global : (typeof legacy === "boolean" ? legacy : true);
        setEnabled(val);
      });

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "sync")
      {
        if (changes[GLOBAL_ENABLED_KEY])
        {
          const next = changes[GLOBAL_ENABLED_KEY].newValue;
          if (typeof next === "boolean") setEnabled(next);
        } else if (changes[ENABLED_KEY])
        {
          // If only legacy key changed, mirror it
          const next = changes[ENABLED_KEY].newValue;
          if (typeof next === "boolean") setEnabled(next);
        }
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    // Write both keys to keep old/new paths in sync
    chrome.storage.sync.set({ [ENABLED_KEY]: next, [GLOBAL_ENABLED_KEY]: next });
  };

  return { enabled, update };
}