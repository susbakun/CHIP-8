You've actually implemented this very close to how a real emulator does it. There are three independent pieces working together:

the CPU (Fx18)
the timer
the audio generator
1. What is the sound timer?

CHIP-8 has two hardware timers:

delay timer (DT) — just a countdown that games can read.
sound timer (ST) — another countdown, except while it is > 0, the buzzer must make sound.

Both timers tick at exactly 60 Hz.

For example:

ST = 5

means

frame 1: ST = 5  sound
frame 2: ST = 4  sound
frame 3: ST = 3  sound
frame 4: ST = 2  sound
frame 5: ST = 1  sound
frame 6: ST = 0  silence

Notice that the CPU doesn't decrease ST.

The hardware timer does.

2. What does Fx18 do?

The instruction

Fx18

means

"Set the sound timer equal to VX."

Suppose

V0 = 20

Then

F018

does

timer.soundTimer = 20

That's all the CHIP-8 specification requires.

Your implementation also starts or stops the audio:

case 0x18:
    timer.soundTimer = rx_value

    if (rx_value > 0) {
        audio.play()
    } else {
        audio.stop()
    }

    break

This isn't part of the CHIP-8 instruction itself—it's your emulator connecting the virtual hardware to the real speaker.

3. Why do we call audio.play()?

Imagine you only did

timer.soundTimer = 20

Nothing would happen.

Your audio generator wouldn't know it should begin producing samples.

So you tell it:

audio.play()

which simply does

playing = true

Now the speaker starts outputting waveform samples.

4. Why does next_sample() check playing?
private next_sample() {
    if (!this.playing)
        return 0;

The audio stream is always running.

It is constantly asking

"Give me the next audio sample."

If we aren't supposed to make sound, we simply return

0

which is silence.

Otherwise we generate the square wave from the XO-CHIP pattern.

5. What does Timer.tick() do?

Every

1 / 60 second

you execute

timer.tick(audio)

which does

if (delayTimer > 0)
    delayTimer--;

Normal CHIP-8 timer.

Then

if (soundTimer > 0) {
    soundTimer--;

    if (soundTimer === 0)
        audio.stop();
}

Suppose

soundTimer = 3

Ticks:

tick 1
--------
3 -> 2

tick 2
--------
2 -> 1

tick 3
--------
1 -> 0
audio.stop()

tick 4
--------
already silent

So the timer automatically turns the sound off when it expires.

Why audio.stop() instead of only reset()?

Suppose you only reset

bit_index = 0;
phase = 0;

The generator would still produce samples because

playing == true

The sound would restart from the beginning forever.

Instead,

audio.stop()

does

playing = false;
reset();

so

next_sample()

returns

0

which is silence.

What changed when you switched to a Readable stream?

Originally you had something like

setInterval(generate)

That seems reasonable, but it's actually unreliable.

The operating system's audio driver expects data continuously.

Sometimes your timer fires a little late:

Audio device:
Need 1024 samples...

Node:
...
(still sleeping)
...

The speaker runs out of samples.

That's the

buffer underflow

warning.

With

Readable

the direction is reversed.

Instead of you pushing data every few milliseconds,

the speaker asks:

I need more audio now.

Then your read() function runs:

read: () => {
    const buffer = this.generate();
    this.stream.push(buffer);
}

So the speaker pulls audio whenever it needs it.

This matches Node's streaming model and avoids underflows because the consumer controls the pace.

So the whole system now looks like this:

          Fx18
            │
            ▼
   soundTimer = VX
            │
            ▼
     audio.play()
            │
            ▼
    playing = true
            │
            ▼
Readable stream ─────────► Speaker
            │
            ▼
      next_sample()
            │
            ▼
    pattern + pitch
            │
            ▼
      generated waveform


60 Hz timer
     │
     ▼
soundTimer--

     │
     ▼
soundTimer == 0 ?

     │
    yes
     │
     ▼
 audio.stop()
     │
     ▼
playing = false
     │
     ▼
next_sample() returns 0 (silence)

This separation of responsibilities is exactly how the original CHIP-8 hardware worked conceptually: the CPU only sets the sound timer, the timer hardware decrements it at 60 Hz, and the audio hardware emits sound whenever the timer is nonzero. Your emulator mirrors that architecture quite closely.
