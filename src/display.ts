import sdl from "@kmamal/sdl"

export class Display {
  public width = 64
  public height = 32
  public pixels = Buffer.alloc(this.width * this.height * 4)

  public window: sdl.Sdl.Video.Window | null = null

  create() {
    this.window = sdl.video.createWindow({
      title: "CHIP-8",
      width: this.width * 10,
      height: this.height * 10,
    })
  }

  clear() {
    if (this.window) {
      this.pixels.fill(255)

      this.window.render(
        this.width,
        this.height,
        this.width * 4,
        "rgba32",
        this.pixels,
      )
    }
  }
}
