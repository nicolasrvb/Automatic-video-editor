# LocalCut A/B batches

Create edit → A/B test → choose two or three versions. Each version chooses a soundtrack from the current music folder (or inherits the selected track), cut pacing and constant clip speed. Create draft immediately opens Progress; A/B comparisons display players, settings, actual output durations, warnings and per-version reports. Ordinary History and storyboard remain available for each output.

Shared: source list, exclusions, directions, provider, target duration, orientation, audio settings and quality. Changed: soundtrack, cuts-per-musical-time and source playback speed. Selection may differ with pacing; this is a creative-variant comparison, not a statistical experiment isolating one variable. To isolate one variable, keep the other controls identical.

Each version renders locally to its own `D:/LocalCut Studio/exports/<run-id>` folder. Batch mode explicitly uses the local renderer, disables ramps, extra HQ destination copies and automatic messages; SQ and source-folder packages are now on by default. Original audio follows constant clip speed via pitch-preserving atempo. Filmora XML references individual rendered shots on D: so speed/rotation/audio decisions are baked in; cuts remain editable. Keep referenced shot media available. Native import is tracked separately.

Optimization: one worker at a time; metadata/contact-sheet analysis cached by source identity; AI assessments reused through existing cache keys when source/directions/provider match; ordering may require another model call when the selected set differs. Identical rendered segments reuse the existing segment cache. Per-job `reuse.probeHits`, `reuse.sampleHits` and `cacheHits` expose reuse. Each song retains its own beat analysis. Slow motion uses the selected interpolation setting without frame blending.

Persistence: manifests in data/variant-batches; jobs remain normal data/runs records. Closing/restarting the page does not stop the coordinator. Only one active edit/batch is allowed. Cancellation stops the current render via its existing cancel flag and cancels waiting versions. Failures stop remaining versions to avoid repeating errors. An interrupted coordinator is reported without automatically duplicating a render.

Validation: generated-footage integration test produced three 12-second HQs with 6/10/3 shots and 1.0/1.2/0.8 speeds. All passed existing decode/duration checks. B/C each reused ten probes and ten sample analyses. Unit assertions cover cut density, speed ratios, timeline continuity, bad settings and concurrent-batch rejection. These are technical checks, not a judgment of artistic quality.

2026-10-20: Per-version seeds select among comparable approved moments and seed model calls/order caches. Qwen quality review runs in both attended and unattended modes; those labels now describe requested ChatGPT attendance only. Audio/music arrangement algorithms remain unchanged.
