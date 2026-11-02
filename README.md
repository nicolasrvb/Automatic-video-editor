# LocalCut Studio — local installation

Open **LocalCut Studio** on your desktop. It starts the page even after a reboot.

Everything new is in `D:\LocalCut Studio`: app, Node/FFmpeg, GPU model runtime, model files, package/browser caches, previews, run reports, and exports. Original footage stays on its source drive. Existing ComfyUI models were copied, not removed, so ComfyUI remains usable.

## First edit

1. Browse to a video folder. Choose whether to include subfolders and whether each folder gets its own edit.
2. Choose local rendering, Filmora, DaVinci Resolve, or another XML-compatible editor. XML references source media instead of embedding it. Do not use your editor's Archive Project feature. Put its proxy/cache folders on D: too.
3. Choose length, source orientation, music, original sound, and exclusions. Exclusions use `filename.mp4 | 12-26` in seconds or just the filename to remove the entire clip.
4. Pick Bonsai, Qwen, local rules, GPT, or a local OpenAI-compatible model server. Local models run one at a time. GPT needs an API model name and `OPENAI_API_KEY` in the launcher environment; no key is stored in the page. GPT previews go to OpenAI. This is separate from a ChatGPT subscription.
5. Choose unattended or vigilant. Unattended uses AI to choose and order shots, then runs local rendering and decode checks. Vigilant also reviews sampled frames of each rendered shot and records concerns; it can retry optical-flow shots using original frames. It does not examine every frame or guarantee artistic quality.

## Second pass

Review the XML draft in your editor. Back in History, open the run and edit its shot-number list: omit weak shots or reorder the numbers. **Re-time approved shots** creates a new run using only those selections, with no additional model call. Rejected selections are not reintroduced. Filmora's proprietary WFP project is not parsed automatically. Exact trim changes made inside Filmora must currently be reflected using source exclusions in a new run; do not expect an automatic WFP round-trip.

## Audio and exports

Music comes from `E:\Audios\Pixabay` with an inline preview player. End fades are applied. If a track is shorter than the requested video, the edit follows the shorter track instead of looping arbitrary music. Shortages of distinct approved footage are reported instead of repeating clips silently.

Original audio is mixed at the chosen level. Its shots use constant speed to maintain synchronization. Optional effects need a local sound file you own; a vision model marks appropriate nature/water shots. No downloaded sound effects are bundled. No on-screen text is added.

HQ uses H.264 CRF 18 at the selected canvas size; it is high quality, not a bit-for-bit original. A copy is saved to `G:\My Drive\Videos` when requested. If G: is unavailable, the verified master remains in D: exports and a warning is recorded.

SQ is a separate small H.264/AAC MP4 (maximum 640px side, capped bitrate, fast-start). It is prepared for inline WhatsApp video playback.

## WhatsApp

Open Connections > Pair WhatsApp and scan the QR using WhatsApp's Linked devices. This uses the unofficial whatsapp-web.js local bridge; account authentication must be completed by you. Session and browser data stay under the D: app folder. When enabled, sends go only to the connected account's own self-chat, displayed as **Cellphone Taiwan (You)**, as video media rather than documents. There is no automatic contact-name guessing.

Delivery records sent message IDs. It attempts to download and decode WhatsApp's media copy. That is not proof of playback on your physical phone. After playing the received video and checking clarity, use **I checked phone playback & clarity**. The page never marks that user check complete automatically.

Keep the page server running for notification/delivery dispatch. Rendering workers continue if the browser closes. The computer must remain awake. Failed deliveries can be retried from History.

## Usage and storage

Each run starts its own usage counter at zero and records provider-reported input, output, and cached-input tokens. Cached tokens are a subset of input tokens, not an extra charge. Missing fields are reported as unknown. Application analysis-cache hits are recorded separately. ChatGPT/Codex subscription-wide counters and development costs are not available to this app. Local tokens incur no cloud-model charge; local processing still uses hardware and electricity.

Temporary rendered segments are removed after a successful master/SQ export. Plans, analysis previews, and masters stay available. Interrupted runs may leave recoverable temporary segments on D:. Existing earlier project files on C: are preserved.

## Dependencies

Bonsai 2 PTQ1_0 and its Q8 vision projector: PrismML official Hugging Face repository. Runtime: official PrismML llama.cpp fork, pinned `prism-b10743-adfffbe`, CUDA 12.4 Windows x64. Qwen: existing local Q4 model and BF16 projector. Node and FFmpeg are bundled from the prior LocalCut installation. WhatsApp dependencies and licenses are in node_modules. No routine startup downloads are required.

Model settings are in `models\registry.json`. The 8 GB GPU configuration uses partial GPU offload and CPU vision projection to leave room for the desktop. Model loading may take a minute. Unload the model in Connections when using another GPU-heavy application.
