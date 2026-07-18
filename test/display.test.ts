import { describe, expect, it } from "vitest"
import { Display } from "../src/computer/display"

describe("Display", () => {
  it("starts with a black framebuffer", () => {
    const display = new Display()

    expect(display.pixels.every((value) => value === 0)).toBe(true)
  })

  it("clears the framebuffer to white", () => {
    const display = new Display()
    display.pixels[0] = 1

    display.clear()

    expect(display.pixels.every((value) => value === 255)).toBe(true)
  })

  it("xor-draws sprite pixels across rgb channels", () => {
    const display = new Display()

    display.display_sprite(0, 1)
    expect(display.pixels[0]).toBe(1)
    expect(display.pixels[1]).toBe(1)
    expect(display.pixels[2]).toBe(1)

    display.display_sprite(0, 1)
    expect(display.pixels[0]).toBe(0)
    expect(display.pixels[1]).toBe(0)
    expect(display.pixels[2]).toBe(0)
  })
})
