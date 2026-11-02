# Using and testing the Concept B branch

Stable source is on `main` at `b1d8d33f06df34ac2a74f57d0668720e229d539a`. The remote recovery branch is `pre-ux-redesign-2026-11`; a matching tag is in the local checkout. Publish that tag after Git sign-in is available. Never merge the UX branch before explicit approval.

The installed stable app remains at `D:\LocalCut Studio`, port 8787.

## Run the separate preview

On a PC with the existing LocalCut runtime installed at `D:\LocalCut Studio`, double-click **Start UX Preview.vbs**. It starts the source from this checkout on port 8788. `Start UX Preview.cmd` is the corresponding diagnostic launcher. To use another installation location, change LOCALCUT_HOME in that command file.

The preparation script copies completed history records and settings into ignored `.localcut-preview/` on first launch. It does not copy media, model files or WhatsApp/browser sessions. Messaging preferences and delivery requests are disabled in those copies. Existing outputs remain referenced for review; no original files are moved or rewritten. New preview jobs have their own records. Source-side output packages still use unique names beside the selected source, as in the stable editor.

Runtime/model caches and the bundled audio subsystem are reused from the existing installation. Do not start a competing model or audio job while the stable editor is rendering. The preview has separate settings and run history, but uses the same GPU.

To stop only the preview, run the preview launcher with its environment and `--stop` or end its page-server process. Workers are independent, so cancel a preview edit in the UI before shutting down its server.

## Compatibility and downgrade

No schema migration or dependency/framework upgrade. New `prefixYYMM`, `activity`, `theme` and run `metadata` fields are additive. Existing records and source/output paths remain readable. Optional date prefixes affect only newly created project names and packages; they never rename old exports.

To return to the original stable UI, use the normal LocalCut desktop shortcut or open port 8787. Do not copy `.localcut-preview`, account sessions or settings into stable data.

## Main flow

Choose a folder, confirm its single preview, set common edit options, choose music, then Start edit. The fixed footer shows live work without switching pages. Pause waits for the current model/render step before acknowledging; Resume continues from the same checkpoint. On completion, History selects the new result and exposes playback, output folder and Filmora handoff.

Advanced retains source exclusions, sound mixing, effects, editor choice, A/B versions, seed and revision controls. Model labels are simplified; actual installed models remain documented in Settings. Optional GPT feedback is selectable only with configured API access.

Music waveform is the measured energy envelope from the existing tempo analyzer, not a decorative signal or a new DJ system. BPM remains an estimate. Filenames and source file modification dates are not treated as verified recording dates.

## Deferred roadmap

Authenticated remote/phone monitoring, photo/parallax editing, advanced AI DJ/sound design, and YouTube uploads. Future YouTube defaults: Unlisted and Family Videos. No nonfunctional upload button is shown.
