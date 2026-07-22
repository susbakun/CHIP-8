import Speaker from "speaker"
import { Readable } from "stream"

const SAMPLE_RATE = 48000

export class Audio {
  private speaker = new Speaker({
    channels: 1,
    bitDepth: 16,
    sampleRate: SAMPLE_RATE,
  })

  // 16 * 8-bit
  public pattern = new Uint8Array(0x10)
  private pitch = 4000
  public bit_index = 0
  public phase = 0

  private playing = false

  private readonly BUFFER_SIZE = 1024

  private stream = new Readable({
    read: () => {
      const buffer = this.generate()
      this.stream.push(buffer)
    },
  })

  public start() {
    this.stream.pipe(this.speaker)
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

    this.phase += this.pitch / SAMPLE_RATE

    while (this.phase >= 1) {
      this.phase--
      this.bit_index = (this.bit_index + 1) & 127
    }

    const byte = this.pattern[this.bit_index >> 3]
    const bit = (byte >> (7 - (this.bit_index & 7))) & 1

    return bit ? 12000 : -12000
  }

  public set_pitch(pitch: number) {
    this.pitch = 4000 * Math.pow(2, (pitch - 64) / 48)
  }

  public play() {
    this.playing = true
  }

  public stop() {
    this.playing = false
    this.reset()
  }

  public reset() {
    this.bit_index = 0
    this.phase = 0
  }
}
