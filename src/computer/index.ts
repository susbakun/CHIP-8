import { readFileSync } from "fs"
import { CPU } from "./cpu/index.ts"
import { Display } from "./display.ts"
import { Timer } from "./timer.ts"
import path from "path"
import type { Quirks } from "../types.ts"
import { Audio } from "./audio.ts"

const FRAME_LENGTH = 1000 / 60

export class Computer {
  private display = new Display()
  private cpu = new CPU()
  private timer = new Timer()
  private audio = new Audio()
  private quirks: Quirks

  private readonly cpu_hz = 10000

  constructor(quirks: Quirks) {
    this.quirks = quirks
  }

  public setup() {
    // load font
    this.cpu.load_fonts()

    // load rom
    const rom_name = process.argv[2] ?? "ibm.ch8"
    const rom_path = path.join("./roms", rom_name)
    const rom = readFileSync(rom_path)
    this.cpu.load_rom(rom)

    // start the audio system
    this.audio.start()
  }

  public run() {
    this.setup()

    setInterval(() => {
      for (let i = 0; i < this.cpu_hz; i++) {
        this.cpu.cycle(this.display, this.timer, this.audio, this.quirks)
      }
    }, FRAME_LENGTH)

    setInterval(() => {
      this.timer.tick(this.audio)
    }, FRAME_LENGTH)

    setInterval(() => {
      this.display.render()
    }, FRAME_LENGTH)
  }
}
