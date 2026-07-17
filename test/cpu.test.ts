import { beforeEach, describe, expect, it } from "vitest"
import { CPU } from "../src/cpu.ts"
import { FONTSET } from "../src/font.ts"
import { Display } from "../src/display.ts"
import sdl from "@kmamal/sdl"


describe("CPU", () => {
  let cpu: CPU
  let display: Display

  beforeEach(() => {
    cpu = new CPU()
    display = new Display()
  })

  it("loads the built-in font into memory", () => {
    cpu.load_fonts()

    for (let i = 0; i < FONTSET.length; i++) {
      expect(cpu["memory"][0x50 + i]).toBe(FONTSET[i])
    }
  })

  it("clears the display", () => {
    display.pixels.fill(1)

    cpu.decode(0x00e0, display)

    expect(display.pixels.every((value) => value === 255)).toBe(true)
  })

  it("sets a register with LD Vx, byte", () => {
    cpu.decode(0x6005, display)

    expect(cpu.registers[0]).toBe(5)
  })

  it("adds a constant to a register", () => {
    cpu.decode(0x600a, display)
    cpu.decode(0x7003, display)

    expect(cpu.registers[0]).toBe(13)
  })

  describe("8xy0 logical and arithmetic instructions", () => {
    it("copies Vy into Vx", () => {
      cpu.decode(0x6107, display)
      cpu.decode(0x8010, display)

      expect(cpu.registers[0]).toBe(7)
    })

    it("ORs Vy into Vx", () => {
      cpu.decode(0x600f, display)
      cpu.decode(0x6101, display)
      cpu.decode(0x8011, display)

      expect(cpu.registers[0]).toBe(0x0f)
    })

    it("ANDs Vy into Vx", () => {
      cpu.decode(0x600f, display)
      cpu.decode(0x6103, display)
      cpu.decode(0x8012, display)

      expect(cpu.registers[0]).toBe(0x03)
    })

    it("XORs Vy into Vx", () => {
      cpu.decode(0x600f, display)
      cpu.decode(0x6103, display)
      cpu.decode(0x8013, display)

      expect(cpu.registers[0]).toBe(0x0c)
    })

    it("adds Vy to Vx and stores the carry in VF", () => {
      cpu.decode(0x60ff, display)
      cpu.decode(0x6101, display)
      cpu.decode(0x8014, display)

      expect(cpu.registers[0]).toBe(0x00)
      expect(cpu.registers[0xf]).toBe(1)
    })

    it("subtracts Vy from Vx and stores the borrow in VF", () => {
      cpu.decode(0x600a, display)
      cpu.decode(0x6103, display)
      cpu.decode(0x8015, display)

      expect(cpu.registers[0]).toBe(7)
      expect(cpu.registers[0xf]).toBe(1)
    })

    it("shifts Vy right and stores the lsb in VF", () => {
      cpu.decode(0x610b, display)
      cpu.decode(0x8016, display)

      expect(cpu.registers[0]).toBe(0x05)
      expect(cpu.registers[0xf]).toBe(1)
    })

    it("subtracts Vx from Vy and stores the borrow in VF", () => {
      cpu.decode(0x6003, display)
      cpu.decode(0x610a, display)
      cpu.decode(0x8017, display)

      expect(cpu.registers[0]).toBe(7)
      expect(cpu.registers[0xf]).toBe(1)
    })

    it("shifts Vy left and stores the msb in VF", () => {
      cpu.decode(0x6180, display)
      cpu.decode(0x801e, display)

      expect(cpu.registers[0]).toBe(0x00)
      expect(cpu.registers[0xf]).toBe(1)
    })
  })

  it("draws a sprite from memory and sets VF on collision", () => {
    cpu.decode(0xa050, display)
    cpu.decode(0x6000, display)
    cpu.decode(0x6100, display)
    cpu.decode(0xd005, display)

    expect(display.pixels[0]).toBe(1)
    expect(display.pixels[3]).toBe(1)
    expect(display.pixels[6]).toBe(1)
    expect(display.pixels[9]).toBe(1)
    expect(cpu.registers[0xf]).toBe(0)

    cpu.decode(0xd005, display)

    expect(cpu.registers[0xf]).toBe(1)
  })

  it("skips the next instruction when a mapped key is not pressed", () => {
    cpu.decode(0x600c, display)

    const pcBeforeSkip = cpu["pc"]
    cpu.decode(0xe0a1, display)

    expect(cpu["pc"]).toBe(pcBeforeSkip + 2)
  })
})
