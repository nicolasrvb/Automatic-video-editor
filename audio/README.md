# LocalCut Audio 1.0

Independent local audio workspace, integrated at LocalCut → Audio studio.

## Features

* Natural length: searches pairs of beat positions separated by multiples of four, ranks harmony/timbre/energy similarity, removes or repeats an interior passage, and retains the original beginning and ending. Exact duration uses a pitch-preserving adjustment limited to roughly 3.5%; optional ±2-second tolerance avoids unnecessary adjustment.
* Sequential mix: independently fits A/B to their shares, optionally matches tempos within 8%, and crossfades A into B.
* Parallel mix: fits and layers A/B with independent gains, optional B start offset and bass reduction. This mixes full tracks; it does not separate stems or remove conflicting vocals.
* Two-pass loudness normalization (-16 LUFS target, -1.5 dBTP target), 48 kHz/24-bit stereo WAV, duration/sample-peak verification, six-second join previews, final beat analysis, JSON reports and cached source analysis.

Beat groups are not verified bars, downbeats or semantic musical sections. Tempo matching is not a guarantee of phase synchronization throughout a song. A failed phrase search stops rather than silently substituting an arbitrary cut. Automated checks are not a listening review. Listen before publishing.

## Architecture

`analysis.py` → `duration.py` / `mixing.py` → `worker.py`. LocalCut's `audio-api.cjs` starts a separate background worker; closing the page does not stop work. One audio job at a time; no GPT/Qwen calls, cloud uploads or runtime model downloads. Original video jobs and existing music-fit remain unchanged. Use a completed soundtrack via **Use in Create edit**; this disables a second restructuring pass. Match the video duration to the soundtrack shown in its report.

Versioned cache keys include source path, size and modification timestamp. Analysis provider can be replaced while retaining its schema (duration, BPM, beats, beat-point chroma/timbre/energy). An All-In-One or Beat This adapter is a future extension, not currently installed or claimed. All-In-One's Windows NATTEN build and additional model/dependency footprint were deferred in favor of a smaller working build.

Outputs: `audio/exports/<job-id>`. Jobs/logs: `audio/jobs`. Analysis/JIT cache: `audio/cache`. Dependencies: `audio/.venv`. The venv uses the already installed Python 3.12 base runtime; it is isolated but not a portable embedded Python distribution. FFmpeg is reused from `../runtime/ffmpeg.exe`.

## Reproduce / upgrade

1. Back up this module and the app integration files.
2. With Python 3.12 installed, create `.venv` in this folder.
3. `.venv/Scripts/python -m pip install -r requirements.lock.txt`
4. Run `test_audio.py` plus real shortening, extension and two-song jobs before promoting upgrades. Keep dependency pins until these checks pass.
5. CLI: `.venv/Scripts/python worker.py jobs/<id>.json`, with `id`, `config` and `createdAt` fields. Config modes: `fit`, `sequential`, `parallel`; required sourceA, duration; sourceB for mixes. See completed job JSONs for examples.

Source tracks: 2 seconds–20 minutes. Output: 3–600 seconds. Audio is decoded in memory; long tracks can require substantial RAM. First analysis includes Numba compilation and is slower. Track analysis is reused on later jobs. No automatic library updates or repeated downloads.

## Upstream projects / licensing

* librosa 0.11.0 — https://github.com/librosa/librosa — ISC
* Spotify Pedalboard 0.9.22 — https://github.com/spotify/pedalboard — GPL-3.0 (includes time-stretch functionality)
* SoundFile — https://github.com/bastibe/python-soundfile — BSD-3-Clause, libsndfile dependencies
* NumPy / SciPy — https://github.com/numpy/numpy / https://github.com/scipy/scipy — BSD
* FFmpeg — existing LocalCut build; see `../runtime/FFMPEG-LICENSE.txt` and build notices.

This is a local integration, not a redistribution license grant. Preserve upstream licenses and review GPL obligations before distributing a packaged product. Full pinned dependency versions are in requirements.lock.txt and package licenses are retained in .venv/Lib/site-packages.
