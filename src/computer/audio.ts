import sdl from "@kmamal/sdl"

const SAMPLE_RATE = 48000

export class Audio {
  public pattern = new Uint8Array(0x10)

  private pitch = 4000
  public bit_index = 0
  private playing = false
  public phase = 0

  private readonly BUFFER_SIZE = 1024

  private device = sdl.audio.openDevice(
    { type: "playback" },
    {
      channels: 1,
      frequency: SAMPLE_RATE,
      format: "s16",
    },
  )

  constructor() {
    this.device.pause() // start paused
  }

  public start() {
    this.device.play()
  }

  private generate(): Buffer {
    const buffer = Buffer.alloc(this.BUFFER_SIZE * 2)
    for (let i = 0; i < this.BUFFER_SIZE; i++) {
      const sample = this.next_sample()
      buffer.writeInt16LE(sample, i * 2)
    }
    return buffer
  }

  private next_sample() {
    if (!this.playing) return 0

    const sample = Math.sin(this.phase * Math.PI * 2)

    this.phase += this.pitch / SAMPLE_RATE

    if (this.phase >= 1) this.phase -= 1

    return sample * 8000
  }

  public play() {
    this.playing = true

    // fill SDL queue
    this.device.enqueue(this.generate())
  }

  public stop() {
    this.playing = false
  }

  public set_pitch(pitch: number) {
    this.pitch = 4000 * Math.pow(2, (pitch - 64) / 48)
  }
}
