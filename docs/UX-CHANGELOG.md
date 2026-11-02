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

## 2 — Folder selector and persistent progress

- Added lazy folder expansion, compact real file counts/sizes and edit-status badges, plus one source-video player and generated representative frame.
- Footer now shows recorded progress, queue, current operation and only recent stage estimates. Pauses take effect at safe model/render checkpoints; waiting for the current step is explicit. Cancellation remains available.
- Existing A/B submission is preserved and remains accessible under Advanced.
- Checks: representative preview returned JPEG (26 KB), pause/resume/cancel integration passed, and cross-site API protections plus Sites-button navigation passed.
- Regressions found and fixed: bundled FFmpeg rejected shorthand 0.2 seek formatting; navigation test now uses HTTP headers faithfully rather than Fetch overriding its mode.


## 3 — Music, History and project organization

- Compact music strip now displays the selected song, a measured 120-bin energy waveform, estimated BPM/duration and working play/pause. Existing searchable list and sound controls stay in Change Music.
- Shared master-detail History keeps one preview, newest completed edits first, search, primary output actions and existing advanced revision controls.
- Successful new edits automatically navigate to History and select their output. Navigation pauses hidden footage/result players.
- Added optional YYMM naming and activity/theme fields; existing settings/paths remain compatible. README and run metadata preserve project context. No unsupported recording-date inference or YouTube controls.
- Main navigation now emphasizes Home, History and Settings; existing refinement/audio tools remain under Editing tools.
- Checks: selected music playback confirmed; waveform contains 120 measured bins and estimated tempo/duration. A real local Qwen test made six analysis calls and generated HQ, SQ, XML and README. Both MP4s fully decode; XML parses. Completion navigation and selected result observed in browser.
- Test target was 4 seconds; Qwen approved 2.375 seconds and reported the source limitation. No artificial padding/repeated footage was introduced.
- Prefix/month rollover/metadata tests pass. No user data schema migration.


## 4 — Desktop launcher repair

- Desktop shortcut bypassed the supplied startup script and had no valid icon path. New scripts use their installation directory, configure existing caches, validate the bundled runtime and log failures.
- Launcher reuses a healthy server, coordinates simultaneous starts and surfaces unresponsive/stale startup state. Browser launch no longer depends on a PowerShell command.
- Backed up and installed only the launcher scripts and repaired shortcut; stable editing UI and user data remain in place. Desktop shortcut was launched and stable server reuse verified on port 8787. Preview cold-start and repeated-launch checks passed on port 8788.
- Tag publication was attempted without interactive sign-in and failed because Git has no credentials. The exact stable commit remains backed up on main and the remote recovery branch; the local tag exists.

