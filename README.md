# rust-in-action

A minimal CHIP-8 emulator written in Rust, based on the project from **Rust in Action** by Timothy Samuel McNamara.

### Implemented

- **CPU**: 16 registers (V0–VF), 4KB memory, 16-level stack
- **Control flow**: `0x0000` halt, `0x00EE` return, `0x1nnn` jump, `0x2nnn` call subroutine
- **Conditional skip**: `0x3xkk` SE (Vx == kk), `0x4xkk` SNE (Vx != kk), `0x5xy0` SE (Vx == Vy)
- **Load / add**: `0x6xkk` load immediate, `0x7xkk` add immediate
- **Register ops (0x8xy?)**: LD (copy), OR, AND, XOR, ADD (with carry in VF)

## Run

```bash
cargo run
```
