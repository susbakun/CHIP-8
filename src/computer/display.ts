import sdl from "@kmamal/sdl"
import { Keyboard } from "./keyboard.ts"

export class Display {
  public width = 64
  public height = 32
  public pixels = Buffer.alloc(this.width * this.height)
  public window: sdl.Sdl.Video.Window

  public keyboard = new Keyboard()

  constructor() {
    this.window = sdl.video.createWindow({
      title: "CHIP-8",
      width: this.width * 10,
      height: this.height * 10,
    })

    // setup event listeners
    this.window.on("keyDown", (event) => this.keyboard.keyDown(event))
    this.window.on("keyUp", (event) => this.keyboard.keyUp(event))
    this.window.on("close", () => {
      process.exit(0)
    })
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
