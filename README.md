# CHIP-8 Emulator

A CHIP-8 emulator written in TypeScript. It uses [@kmamal/sdl](https://github.com/kmamal/node-sdl) for the display and keyboard.

<img width="752" height="464" alt="Screenshot 2026-07-19 at 3 35 43 AM" src="https://github.com/user-attachments/assets/fa2f404f-4a8f-482e-a9f5-2a104d5c15b4" />


## Requirements

- Node.js 22+ (for native TypeScript / `--watch` support)

## Setup

```bash
npm install
```

## Run

From the project root:

```bash
npm run dev
```

By default this loads `roms/ibm.ch8`. Pass a ROM filename as an argument:

```bash
npm run dev -- Pong.ch8
npm run dev -- ibm.ch8
npm run dev -- test_opcode.ch8
```

ROMs live in the `roms/` folder. Press **Esc** to quit.

## Controls

CHIP-8 uses a 16-key hex keypad. Keys map to your keyboard like this:

```
CHIP-8          Keyboard
1 2 3 C         1 2 3 4
4 5 6 D         Q W E R
7 8 9 E         A S D F
A 0 B F         Z X C V
```

## Tests

```bash
npm test
```

## Project layout

```
src/
  computer/     CPU, display, keyboard, timers
  font.ts       Built-in hex digit sprites
roms/           Game / test ROMs
test/           Vitest unit tests
```

## Resource
[Guide to making a CHIP-8 emulator](https://tobiasvl.github.io/blog/write-a-chip-8-emulator)
