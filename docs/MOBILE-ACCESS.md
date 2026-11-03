# Phone planning and live monitoring

The phone interface uses the existing run, settings, folder, music and playback
endpoints. It offers Footage → Edit → Music & start, saves the current setup on
the PC, and shows active edits with pause/resume/cancel. History opens one video
at a time. No media upload, database migration or editing engine replacement is
needed. The manifest supports adding the HTTPS page to a phone home screen;
there is deliberately no offline cache for private media or progress.

## Live companion

`Start Mobile Companion.cmd` runs branch code on loopback port 8789 with the
installed application's canonical data. Its separate `server-mobile.json`,
`launcher-mobile.lock` and log preserve the stable desktop instance on 8787.
The UX preview on 8788 still uses isolated data. No stable source is overwritten.
Do not use the isolated preview for live monitoring.

The stable desktop server owns WhatsApp pairing, delivery and notification
timers. Keep it running. Companion mode never initializes another WhatsApp
session or marks existing runs interrupted at startup. New jobs use the same
worker and storage format; only one active edit can start at a time. Setup
preferences are shared, so the latest saved setup from either device wins.

## Protected remote access

Remote access is disabled by default. Use private Tailscale Serve (never public
Funnel) after installing and signing in on both PC and phone. Bind LocalCut only
to loopback. Configure `data/settings/mobile-access.json` outside Git:

```json
{"enabled":true,"origin":"https://ACTUAL-PC.ACTUAL-TAILNET.ts.net","login":"ACTUAL-OWNER-LOGIN"}
```

Use the actual HTTPS origin and account identity returned by the private setup.
Serve must preserve the HTTPS Host and forward `X-Forwarded-Proto: https` plus
its verified `Tailscale-User-Login`. The application checks exact host, owner,
loopback peer and request origin. A missing header fails closed. If the proxy
changes Host, verify and adapt the proxy configuration before enabling access;
never weaken the guard to accept arbitrary forwarded headers.

Serve the companion with `tailscale serve --bg http://127.0.0.1:8789` using the
current official CLI documentation. Verify access from the owner's phone and
rejection from another account before treating the URL as ready. The URL is
stable while the device name/tailnet remains unchanged. PC must be awake, both
servers running, and the phone connected to Tailscale. There is no public port
forwarding or router change.

Rollback: turn off Serve, disable the local mobile access configuration, then
stop only the companion with the matching LOCALCUT_INSTANCE/COMPANION/PORT
environment and `node app/launcher.cjs --stop`. Stable 8787 remains available.

## Validation

Run `node tests/mobile-access.cjs`; existing metadata, WhatsApp lifecycle and
isolated preview control tests still apply. Phone visual QA must cover 360 and
390 px widths, folder selection, all three planning steps, music playback,
live progress controls, result playback and reopening from the home screen.
Never publish family screenshots or user configuration to the public repository.
