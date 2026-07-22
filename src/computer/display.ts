import sdl from "@kmamal/sdl"
import { Keyboard } from "./keyboard.ts"
import { BLACK, RED, WHITE, YELLOW } from "../colors.ts"
import type { ScrollDirection } from "../types.ts"

export const CHIP8_WIDTH = 64
export const CHIP8_HEIGHT = 32
export const SCHIP_WIDTH = CHIP8_WIDTH * 2
export const SCHIP_HEIGHT = CHIP8_HEIGHT * 2

const SCALE = 10

export class Display {
  public width = CHIP8_WIDTH
  public height = CHIP8_HEIGHT
  public window: sdl.Sdl.Video.Window
  //planes for xo-chip
  public planes = [
    // plane 1
    Buffer.alloc(this.width * this.height),
    // plane 2
    Buffer.alloc(this.width * this.height),
  ]

  // 1 is plane 1, 2 is plane 2, 3 is both, 0 is neither
  public current_plane = 1

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

    this.planes = [Buffer.alloc(width * height), Buffer.alloc(width * height)]

    this.window.setSize(width * SCALE, height * SCALE)

    // recenter the window after resizing
    this.recenter_window()
  }

  public set_current_plane(selected_plane: number) {
    this.current_plane = selected_plane
  }

  private recenter_window() {
    const display = this.window.display

    const new_x = Math.floor((display.geometry.width - this.window.width) / 2)
    const new_y = Math.floor((display.geometry.height - this.window.height) / 2)

    this.window.setPosition(new_x, new_y)
  }

  public scroll(n: number, direction: ScrollDirection) {
    if (this.current_plane === 0) return

    switch (direction) {
      case "Up":
        // do for both planes
        if (this.current_plane === 3) {
          this.scroll_up(n, 0)
          this.scroll_up(n, 1)
        } else {
          this.scroll_up(n, this.current_plane - 1)
        }
        break
      case "Down":
        // do for both planes
        if (this.current_plane === 3) {
          this.scroll_down(n, 0)
          this.scroll_down(n, 1)
        } else {
          this.scroll_down(n, this.current_plane - 1)
        }
        break
      case "Left":
        // do for both planes
        if (this.current_plane === 3) {
          this.scroll_left(0)
          this.scroll_left(1)
        } else {
          this.scroll_left(this.current_plane - 1)
        }
        break
      case "Right":
        // do for both planes
        if (this.current_plane === 3) {
          this.scroll_right(0)
          this.scroll_right(1)
        } else {
          this.scroll_right(this.current_plane - 1)
        }
        break
    }
  }

  private scroll_up(n: number, plane: number) {
    const new_pixels = Buffer.alloc(this.width * this.height)

    for (let row = n; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        new_pixels[(row - n) * this.width + col] =
          this.planes[plane][row * this.width + col]
      }
    }

    this.planes[plane] = new_pixels
  }

  private scroll_down(n: number, plane: number) {
    const new_pixels = Buffer.alloc(this.width * this.height)

    for (let row = n; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        new_pixels[row * this.width + col] =
          this.planes[plane][(row - n) * this.width + col]
      }
    }

    this.planes[plane] = new_pixels
  }

  private scroll_right(plane: number) {
    const new_pixels = Buffer.alloc(this.width * this.height)

    for (let row = 0; row < this.height; row++) {
      for (let col = 4; col < this.width; col++) {
        new_pixels[row * this.width + col] =
          this.planes[plane][row * this.width + col - 4]
      }
    }

    this.planes[plane] = new_pixels
  }

  private scroll_left(plane: number) {
    const new_pixels = Buffer.alloc(this.width * this.height)

    for (let row = 0; row < this.height; row++) {
      for (let col = 4; col < this.width; col++) {
        new_pixels[row * this.width + col - 4] =
          this.planes[plane][row * this.width + col]
      }
    }

    this.planes[plane] = new_pixels
  }

  // colors or either 0 or 1 (black or white)
  public xor_color_with_pixel(plane: number, index: number, color: number) {
    this.planes[plane][index] ^= color
  }

  public clear(plane: number) {
    if (this.current_plane === 0) return

    this.planes[plane].fill(0)
  }

  private get_frame_buffer() {
    const framebuffer = Buffer.alloc(this.width * this.height * 3)

    const n = this.width * this.height

    let j = 0

    for (let i = 0; i < n; i++) {
      const c1 = this.planes[0][i] ? 255 : 0
      const c2 = this.planes[1][i] ? 255 : 0

      const color =
        c1 == 0 ? (c2 == 0 ? BLACK : RED) : c2 === 0 ? WHITE : YELLOW

      framebuffer[j++] = color.r
      framebuffer[j++] = color.g
      framebuffer[j++] = color.b
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
