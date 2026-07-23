import { readFileSync } from "fs"
import { CPU } from "./cpu/index.ts"
import { Display } from "./display.ts"
import { Timer } from "./timer.ts"
import path from "path"
import type { Quirks } from "../types.ts"
import { Audio } from "./audio.ts"

export class Computer {
  private cpu_hz = 1000
  private display_hz = 60

  private display = new Display()
  private cpu = new CPU()
  private timer = new Timer()
  private audio = new Audio()
  private quirks: Quirks

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
    // cpu cycle
    setInterval(() => {
      for (let i = 0; i < this.cpu_hz; i++) {
        this.cpu.cycle(this.display, this.timer, this.audio, this.quirks)
      }
      this.timer.tick(this.audio)
      this.display.render()
    }, 1000 / this.display_hz)
  }
}
