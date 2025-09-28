# Throttlade — Privacy Policy

Effective: 2025-09-28

## Overview

Throttlade is a browser extension that lets you intentionally slow down (throttle) network requests on sites you choose, so you can observe loading behaviour under slower conditions. We care about your privacy. This policy explains what data the extension handles and how.

## What the extension does

- Applies timing delays to requests you choose, inside your own browser.
- Provides a local dashboard to configure rules and see recent throttled requests.

## Data we collect

- We do not collect personal data.
- We do not transmit any data to our servers (we don’t operate any).
- We do not use analytics, tracking, or third‑party ad services.

## Data stored on your device (local only)

The extension stores only your own settings so it can work as you expect:

- Throttling rules (patterns, methods, delays)
- Whether the extension and a given project are enabled
- Project names and rule order

This data is saved using Chrome’s built‑in storage (`chrome.storage.sync`), which may sync across your own Chrome profiles if you have sync enabled. We do not receive this data.

## How permissions are used

We request only the permissions needed to deliver the single purpose of the extension:

- Storage: Save your rules and on/off toggles so they persist between sessions and can sync between your own devices.
- Scripting: Add a small, bundled helper so delays can be applied precisely when a page makes a request. We do not inject remote code.
- Tabs: Open or focus the extension’s dashboard and apply rules to existing tabs after install/startup. We do not read page content or history.
- webRequest: Pace the download of requests you choose, so you can simulate a slower connection. We do not read or store page content.
- Host access (<all_urls>): Let you throttle requests on any site you choose (local, staging, or production) without reinstalling. The extension only acts on requests that match your rules and remains idle when disabled.

## Sharing and selling of data

- We do not share, sell, or transfer any user data to third parties.
- We do not use your data for advertising or profiling.

## Remotely hosted code

- We do not use remotely hosted code. All code runs from the installed extension package and does not update from a server.

## Security

- All processing happens locally within your browser. No data is sent to external servers.
- We rely on Chrome’s extension security model and storage sandbox.

## Data retention and deletion

- Your settings remain in Chrome’s extension storage until you remove them or uninstall the extension.
- To delete your data, you can remove your rules in the dashboard and/or uninstall the extension. If you use Chrome Sync, you can also clear synced extension data from your Google account via Chrome settings. We do not hold any copy.

## Children’s privacy

- The extension is a developer tool and is not directed to children. We do not knowingly collect any personal information from children.

## Changes to this policy

- If we change this policy, we will update the date at the top and include the new version with the extension’s source.

## Contact

- For privacy questions or requests, contact: throttlade.support@markforster.info

---

Short version: Throttlade does not collect personal data, does not send any data to servers, and stores only the settings you create, locally in Chrome’s storage.
