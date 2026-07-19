import sdl from "@kmamal/sdl"
import { Keyboard } from "./keyboard.ts"

export const CHIP8_WIDTH = 64
export const CHIP8_HEIGHT = 32
export const SCHIP_WIDTH = CHIP8_WIDTH * 2
export const SCHIP_HEIGHT = CHIP8_HEIGHT * 2

const SCALE = 10

export class Display {
  public width = CHIP8_WIDTH
  public height = CHIP8_HEIGHT
  public pixels = Buffer.alloc(this.width * this.height)
  public window: sdl.Sdl.Video.Window

  public keyboard = new Keyboard()

  constructor() {
    this.window = sdl.video.createWindow({
      title: "CHIP-8",
      width: this.width * SCALE,
      height: this.height * SCALE,
      vsync: false,
    })

    // setup event listeners
    this.window.on("keyDown", (event) => this.keyboard.keyDown(event))
    this.window.on("keyUp", (event) => this.keyboard.keyUp(event))
    this.window.on("close", () => {
      process.exit(0)
    })
  }

  public change_res(width: number, height: number) {
    this.width = width
    this.height = height

    this.pixels = Buffer.alloc(width * height)

    this.window.setSize(width * SCALE, height * SCALE)

    // clearing framebuffer after resizing
    this.clear()

    // recenter the window after resizing
    this.recenter_window()
  }

  private recenter_window() {
    const display = this.window.display

    const new_x = Math.floor((display.geometry.width - this.window.width) / 2)
    const new_y = Math.floor((display.geometry.height - this.window.height) / 2)

    this.window.setPosition(new_x, new_y)
  }

  public scroll_down(n: number) {
    const new_pixels = Buffer.alloc(this.width * this.height)

    for (let row = n; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        new_pixels[row * this.width + col] =
          this.pixels[(row - n) * this.width + col]
      }
    }

    this.pixels = new_pixels
  }

  public scroll_right() {
    const new_pixels = Buffer.alloc(this.width * this.height)

    for (let row = 0; row < this.height; row++) {
      for (let col = 4; col < this.width; col++) {
        new_pixels[row * this.width + col] =
          this.pixels[row * this.width + col - 4]
      }
    }

    this.pixels = new_pixels
  }

  public scroll_left() {
    const new_pixels = Buffer.alloc(this.width * this.height)

    for (let row = 0; row < this.height; row++) {
      for (let col = 4; col < this.width; col++) {
        new_pixels[row * this.width + col - 4] =
          this.pixels[row * this.width + col]
      }
    }

    this.pixels = new_pixels
  }

  // colors or either 0 or 1 (black or white)
  public write_to_pixels(index: number, color: number) {
    this.pixels[index] ^= color
  }

  public clear() {
    this.pixels.fill(0)
    this.render()
  }

  private get_frame_buffer() {
    const framebuffer = Buffer.alloc(this.width * this.height * 3)

    let j = 0

    for (let i = 0; i < this.pixels.length; i++) {
      const c = this.pixels[i] ? 255 : 0

      framebuffer[j++] = c
      framebuffer[j++] = c
      framebuffer[j++] = c
    }

    return framebuffer
  }

  render() {
    const framebuffer = this.get_frame_buffer()

    this.window.render(
      this.width,
      this.height,
      this.width * 3,
      "rgb24",
      framebuffer,
    )
  }
}
