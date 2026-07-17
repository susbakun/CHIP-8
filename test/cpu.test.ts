import { describe, expect, it } from "vitest"
import { CPU } from "../src/cpu.ts"
import { Display } from "../src/display.ts"

describe("CPU", () => {
  const cpu = new CPU()
  const display = new Display()

  it("clears the display", () => {
    cpu.decode(0x00e0, display)

    expect(display.pixels[6] == 255).toBe(true)
  })

  it("adds x to nn", () => {
    cpu.decode(0x6005, display)

    console.log(cpu.registers[0])

    expect(cpu.registers[0] == 5).toBe(true)
  })
})
