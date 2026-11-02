# Concept B redesign log

Stable recovery commit: `b1d8d33f06df34ac2a74f57d0668720e229d539a` on main and the remote `pre-ux-redesign-2026-11` recovery branch. A matching tag is present in the local checkout; publishing a remote tag is pending Git authentication. No UX changes are merged into main.

## 1 — Shared layout system

- Inspected all three visual references; approved Concept B governs the application.
- Added dark sidebar, light workspace, consistent blue actions, white cards and shared typography.
- Reorganized the live controls rather than replacing their data contracts. All 38 named settings remain associated with the original form, with no duplicates.
- Main workspace now has source, preview and settings columns, music strip, persistent status footer, and progressive disclosure for secondary/advanced settings.
- Added optional environment overrides for application home, data and port. Defaults preserve the installed layout. Preview uses port 8788 and isolated settings/history; stable remains on 8787.
- Checks: JavaScript syntax passes; preview launches; settings load; all 38 original named controls retained; visual inspection at desktop size completed.
- Remaining work at this milestone: folder tree/preview, live footer, music waveform, History master-detail and completion behavior.

## Data policy

No schema migration. Never commit user media, runtime models, settings, authentication/session data, analysis caches or generated outputs. New UX preferences must be additive and ignored safely by the stable version.

## Roadmap — outside this pass

Protected phone monitoring; still-photo/parallax editing; advanced DJ/sound design; YouTube upload (future defaults: Unlisted, Family Videos). No placeholder upload or remote-access controls.
