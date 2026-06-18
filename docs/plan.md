# **Project Specification: Dual-Engine 8-Bar MIDI Framework (V10)**

**Date:** June 2026
**Language:** British English (Strict)
**License:** Open Source (MIT)

## **1\. Project Vision & Executive Summary**

The objective of this project is to create a highly utilitarian, open-source music composition system named **Peitho**. The reusable engines generate raw multi-track MIDI data rather than finished audio renders, while **Peitho-Composer** provides the focused front-end composition surface. Designed for music producers, composers, and game developers, this framework acts as an intelligent sketchpad or structural shell. It provides a foundational framework to jump-start the creative process while leaving 100% of the sound design, synth configuration, and mixing control in the hands of the creator inside their Digital Audio Workstation (DAW).
To eliminate unnecessary bloat and resource overhead, the project enforces a strict architectural ceiling: all generation is rigidly constrained to a maximum of **8 bars** inside a traditional **4/4 time signature** grid. The entire ecosystem is unified under a native TypeScript and Bun runtime environment, completely removing Python dependencies from the core library.

## **2\. Architectural Separation (The Two Engines)**

The core framework is decoupled into two completely independent packages that communicate using a unified, standardised MIDI data object structure. This separation prevents lightweight applications from being weighed down by heavy artificial intelligence frameworks.

| Feature Matrix | Module A: peitho-array (The Foundation) | Module B: peitho-pulse (The AI Layer)   |
| :---- | :---- | :---- |
| **Core Paradigm** | Pure music theory maths and algorithmic matrices. | Non-deterministic symbolic autoregressive planning. |
| **Runtime Stack** | 100% native TypeScript executing under Bun. | 100% Python-free Native MLX execution under Bun (using Native FFI / Node-API bindings). |
| **Dependencies** | Zero neural networks, zero heavy VRAM requirements. | ACE-Step 1.5 Language Model (Isolated Planner running locally via Apple Metal API). |
| **Performance Profile** | Sub-millisecond calculation; ultra-low CPU overhead. | Highly optimised; low VRAM footprint utilising 4-bit quantization and Zero-Copy memory allocation. |
| **Primary Use Cases** | Procedural game audio, mobile apps, instant web sketchpads. | Advanced DAW composition generation, complex structural phrasing. |

## **3\. Module A Technical Breakdown: peitho-array**

Module A establishes a rigid mathematical abstraction of foundational music theory rules to cleanly build chord skeletons, melodies, and syncopation grids natively in TypeScript without stochastic AI drift.

### **3.1 Scale Matrix Arrays**

All permissible note choices are filtered through strict vector offsets mapped to absolute MIDI note values (0–127). The system shifts its base index dynamically depending on a user-selected root note:

* Pentatonic Major Step Vector: \[0, 2, 4, 7, 9\]
* Pentatonic Minor Step Vector: \[0, 3, 5, 7, 10\]
* Heptatonic (Diatonic) Major Step Vector: \[0, 2, 4, 5, 7, 9, 11\]
* Heptatonic (Diatonic) Natural Minor Step Vector: \[0, 2, 3, 5, 7, 8, 10\]

### **3.2 Rhythmic Grid & Density Parameters**

The engine enforces a rigid 16th-note step-sequencer array across the 8-bar limit (amounting to 16 subdivisions per bar, creating a total cumulative 128-step master structural block). Programmatic inputs filter this grid dynamically via three distinct user variables:

* **Note Density:** A float probability ceiling (0.0 to 1.0) governing whether a specific grid subdivision allows a note-on event payload.
* **Note Split:** A distribution coefficient determining the structural balancing ratio between polyphonic backing chords (lower frequency intervals) and monophonic melodic or counter-melodic leads (higher frequency intervals).
* **Syncopation / Rhythm Complexity:** A programmatic time-shift variance matrix that algorithmically pushes note triggers off primary downbeats onto weaker subdivisions or syncopated off-beats based on user threshold values.

### **3.3 Musical Mood Archetypes & Preset Matrix**

Rather than hardcoding static chord patterns, song types are designated as metadata parameter matrices mapping emotional behaviours to cadences, voicing styles, and timing variables:

* **Ballad Verse:** Follows a I \- vi \- IV \- V harmonic progression using grounded root positions and close voice leading to preserve smooth transitions.
* **Ballad Chorus:** Follows a IV \- V \- I \- vi harmonic progression featuring open voicings and extended octave spreads across upper ranges.
* **Ballad Bridge:** Follows a ii \- IV \- vi \- V progression, substituting suspended chord variants (e.g., sus2, sus4) to elevate linear harmonic tension.
* **Rousing Crescendo:** Follows a I \- IV \- V \- vi \- bVII \- V matrix using ascending pitch vectors and rising bass notes paired with expanding velocities.
* **Moody Wind Down:** Follows a vi \- v \- IV \- III descending Aeolian minor progression, utilising dropped extensions and decaying note-off boundaries.

### **3.4 Algorithmic Melodic Motion & Constraint Rules**

To eliminate disjointed, chaotic note scattering ("plinky-plonky" randomness), peitho-array enforces a mathematical heuristic framework that prioritises human-like fluidity, organic contours, and cohesive voice leading. Left to its own devices, a computer naturally chooses chaos and sounds like a toddler banging on a glass marimba because it lacks an innate comprehension of beauty or smoothness. Therefore, rather than trusting the engine to blindly generate a pleasing tune, peitho-array introduces hard boundaries that physically forbid structural chaos by enforcing the mathematical secrets human composers have relied upon for centuries:

* **The 80/20 Rule of Melodic Motion:** To preserve physical continuity, a minimum of 80% of all progressive interval selections are restricted to step-wise movement (0, 1, or 2 scale degrees away from the preceding note value). Only a maximum of 20% of musical triggers are permitted to compute a wider interval leap.
* **Leap Directional Compensation:** Whenever a wide interval leap is triggered (exceeding 3 scale degrees), a strict algorithmic boundary is instantly active on the succeeding step. The following note target is mathematically forced to reverse its melodic direction and resolve step-wise to counteract and balance the structural tension.
* **Downbeat Chord-Tone Anchoring:** Note allocations falling on the primary foundational downbeats of the grid (Beats 1 and 3 of every bar container) must select pitches matching the active, underlying chord matrix. Passing tones and non-chord intervals can only populate weaker 16th subdivisions or off-beat syncopation flags, preventing cognitive dissonance, eliminating random drift, and providing deliberate cohesion.

## **4\. Module B Technical Breakdown: peitho-pulse (Python-Free Local AI Framework)**

Module B acts as a creative structural overlay for scenarios requiring organic complexity and non-deterministic phrasing. It executes the isolated ACE-Step 1.5 autoregressive planner model natively under Bun without Python environmental constraints.

* **Audio Stage Bypass:** The system completely isolates the Autoregressive Language Model planner component of ACE-Step 1.5, entirely discarding and bypassing the Diffusion Transformer (DiT) phase. No raw audio waveforms are ever generated or decoded.
* **Token Interception & Translation:** The module hooks into the LM layer to capture raw text-based structural layout tokens and symbolic composition strings.
* **MIDI Compiler Mapping:** A specialized parsing bridge converts text tokens into native MIDI integers, delta-time execution ticks, and programmatic velocity curves. The output is mapped cleanly into multi-track MIDI containers matching the exact format produced by Module A.
* **Apple Silicon Native Execution:** To leverage Apple's unified memory architecture, weights are converted into standard .safetensors format and compressed using 4-bit (INT4) quantization. This reduces the footprint to 2GB–4GB, loading directly into memory.
* **Bun-to-MLX Integration Stack:** Native model compilation maps straight to the Apple Metal API via two interchangeable pipelines:

1. **Native Node-API / Node-MLX Bindings:** Bun automatically flags and runs pre-compiled native Node addons, letting TypeScript code load the model structure directly using raw JS syntax.
2. **Bun Native Foreign Function Interface (bun:ffi):** If customised weight parsing maps are required, Bun links dynamically via a tiny compiled C++ dynamic library (libmlx.dylib), allowing near-native execution parameters straight from the engine files.

### **4.1 Architecture: How Bun Talks to MLX**

Instead of relying on a Python server, the ecosystem executes the model weights directly within TypeScript files using Bun's Native FFI or a compiled native binding. This achieves unified memory zero-copy paths.
`+-------------------------------------------------------------+`
`|               @peitho/pulse (TypeScript Engine)             |`
`|   - Manages prompt inputs, seeds, and token generation      |`
`+-------------------------------------------------------------+`
                               `|`
                        `(Bun Native FFI)`
                               `v`
`+-------------------------------------------------------------+`
`|             libmlx.dylib (Apple Silicon Metal Core)          |`
`|   - Loads quantized ACE-Step weights directly into VRAM     |`
`|   - Generates text tokens via unified memory zero-copy      |`
`+-------------------------------------------------------------+`

The code baseline implementing the Python-free MLX loading array and generation configuration inside Bun is cleanly laid out inside a native code container:
`import { mlx } from "node-mlx";`

`export class PeithoPulseEngine {`
  `private model: any;`
  `private tokenizer: any;`

  `constructor() {`
    `// 1. Direct path to the model directory on the Mac (No Python environment needed)`
    `const modelPath = "./models/acestep-1.5-planner-mlx";`

    `// 2. Load the model directly into Apple Silicon Unified Memory`
    `this.model = mlx.loadModel(modelPath);`
    `this.tokenizer = mlx.loadTokenizer(modelPath);`
  `}`

  `/**`
   `* Generates raw structural musical tokens from a mood prompt`
   `*/`
  `public generateMusicalTokens(prompt: string, density: number): string[] {`
    ``const formattedPrompt = `<|system|>Structure an 8-bar 4/4 grid.<|user|>\${prompt} Density: \${density}`;``
    `const inputIds = this.tokenizer.encode(formattedPrompt);`

    `// 3. Native execution straight to the GPU via Metal`
    `const outputTokens = mlx.generate({`
      `model: this.model,`
      `promptTokens: inputIds,`
      `maxTokens: 256,`
      `temp: 0.7`
    `});`

    `const outputText = this.tokenizer.decode(outputTokens);`

    `// Returns the clean array of token instructions (e.g., ["C4", "1/16", "v80"])`
    `return this.parseTokens(outputText);`
  `}`

  `private parseTokens(rawText: string): string[] {`
    `return rawText.split(" ").filter(t => t.length > 0);`
  `}`
`}`

## **5\. Procedural Game-Engine Seeding Pipeline**

To enable immediate integration into real-time applications (such as generating ambient soundscapes dynamically as a player traverses a game world), Module A implements a lightweight, low-overhead randomisation pipeline:

1. **Environmental Input Capture:** Active multi-variable vectors—such as player coordinate updates, object tags, or collision data string values—are continually read from the game runtime.
2. **Cryptographic Synthesis:** These variable parameters pass into a rapid, non-cryptographic hashing routine (e.g., MurmurHash) combined with high-precision system microseconds.
3. **32-Bit Seed Assignment:** The routine yields a deterministic 32-bit integer seed that directly drives the pseudo-random loops inside Module A.
4. **Dynamic Instantiation:** The engine modifies grid step assignments, structural density matrices, and chord progression branches on the fly, executing seamlessly without CPU lag or audio interruption.

## **Appendix A: Architectural References & Inspired Engines**

To provide historical framework alignment and foundational re-engineering benchmarks, the heuristic constraints utilised within peitho-array are mapped from three major computational musicology implementations:

| Inspired Framework | Core Architectural Precedent Reference | Re-Engineered Adaptations inside Peitho   |
| :---- | :---- | :---- |
| **Google Magenta (MelodyRNN / NoteSequencer)** | Established systemic constraints to filter stochastic drift by favoring step-wise note intervals. Discovered that human-sounding continuity relies on strict scale-proximity thresholds. | Directly adapted into the 80/20 Rule of Melodic Motion (Section 3.4), bounding index increments to adjacent scale vector positions to strip away random jumps. |
| **Scribbletune (Heliocentric Project)** | Pioneered pure JavaScript decoupling of pitch matrices from rhythmic layout masks ("Clips"). Proved complex musical shapes can be mapped efficiently via decoupled string grids. | Adapted into the 128-step master structural array block (Section 3.2), creating a strict separation between rhythmic note-on grids and scale tracking offsets. |
| **David Cope's EMI (Experiments in Musical Intelligence)** | Demonstrated structural cohesion by using reusable multi-note "Signatures" and balance balancing rules (e.g., immediate counter-balancing steps after large pitch jumps). | Directly integrated into the Leap Directional Compensation mechanics (Section 3.4), ensuring any interval breach above a specified threshold triggers a physical counter-step. |
