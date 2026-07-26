# CHIP-8 Emulator

A CHIP-8 emulator written in TypeScript. It uses [@kmamal/sdl](https://github.com/kmamal/node-sdl) for window creation, rendering, keyboard input, and audio output.

The emulator supports the original **CHIP-8** instruction set and **Super-CHIP (SCHIP)** extensions, including high-resolution graphics, scrolling instructions, large fonts, and RPL registers.

<img width="752" height="464" alt="Screenshot 2026-07-19 at 3 35 43 AM" src="https://github.com/user-attachments/assets/fa2f404f-4a8f-482e-a9f5-2a104d5c15b4" />

## Features

* CHIP-8 interpreter
* Super-CHIP (SCHIP) support

  * 128×64 high-resolution mode
  * 64×32 low-resolution mode
  * 16×16 sprites (`DXY0`)
  * Scrolling instructions (`00CN`, `00FB`, `00FC`)
  * Large font support (`FX30`)
  * RPL flag registers (`FX75` / `FX85`)

* Audio system

  * SDL-based PCM audio output
  * CHIP-8 sound timer support
  * XO-CHIP style audio pattern playback foundation
  * Configurable pitch and waveform generation

* Configurable interpreter quirks
* 60 Hz delay and sound timers
* XOR sprite rendering with collision detection
* Hex keypad input
* Unit tests with Vitest

## Requirements

* Node.js 22+

## Installation

```bash
npm install

## Running

Start the emulator:

```bash
npm run dev
```

By default, this loads:

```
roms/ibm.ch8
```

To load a different ROM:

```bash
npm run dev -- Pong.ch8
npm run dev -- ibm.ch8
npm run dev -- test_opcode.ch8
npm run dev -- sweetcopter.ch8
```

All ROMs should be placed inside the `roms/` directory.

Press **Esc** to exit.

## Controls

CHIP-8 uses a hexadecimal keypad mapped to a standard keyboard:

```
CHIP-8          Keyboard
1 2 3 C         1 2 3 4
4 5 6 D         Q W E R
7 8 9 E         A S D F
A 0 B F         Z X C V
```

## Running Tests

```bash
npm test
```

## Project Structure

```
src/
├── computer/
│   ├── cpu/         CPU implementation and opcode decoding
│   ├── display.ts   SDL renderer and framebuffer
│   ├── audio.ts     SDL audio output and sound generation
│   ├── keyboard.ts  CHIP-8 keypad input
│   ├── timer.ts     Delay and sound timers
│   └── index.ts     Emulator entry point
├── font.ts          Standard and Super-CHIP fonts
└── types.ts         Shared types
├── index.ts         Program entry

roms/                CHIP-8 and SCHIP ROMs
```

## Compatibility

The emulator has been tested with several classic ROMs and test suites, including:

* IBM Logo
* Pong
* SweetCopter
* Skyward

## References

* [Guide to making a CHIP-8 emulator](https://tobiasvl.github.io/blog/write-a-chip-8-emulator)
* [Mastering SuperChip](https://johnearnest.github.io/Octo/docs/SuperChip.html)
* [XO-CHIP Specification](https://johnearnest.github.io/Octo/docs/XO-ChipSpecification.html)
