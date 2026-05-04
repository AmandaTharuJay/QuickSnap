## Cursor Cloud specific instructions

### Overview

Quick Snap! is a two-player C# card game using the SwinGame SDK (SDL-based). It compiles with Mono and runs as a native windowed desktop application.

### System dependencies

The following must be installed via `apt-get` (handled by the update script):

- `mono-complete` — C# compiler (`mcs`) and runtime (`mono`)
- `nunit-console` — NUnit 2.6.4 test runner
- `xvfb` — virtual framebuffer (needed if running the app headlessly)
- SDL 1.x dev libraries (`libsdl1.2-dev`, `libsdl-image1.2-dev`, `libsdl-mixer1.2-dev`, `libsdl-ttf2.0-dev`, `libsdl-net1.2-dev`, `libsdl-gfx1.2-dev`)

### Build, test, and run

- **Build:** `./build.sh` (debug build with NUnit tests compiled in)
- **Clean:** `./clean.sh`
- **Run tests:** After building, copy the NUnit DLL and run:
  ```
  cp packages/NUnit.2.6.4/lib/nunit.framework.dll bin/Debug/
  nunit-console bin/Debug/workspace.exe
  ```
- **Run app:** `./run.sh` (requires a display; use `Xvfb :99 &` and `export DISPLAY=:99` for headless)

### Known limitations

- The native SwinGame library (`libSGSDK.so`) for Linux is **not bundled** in this repository. Only Mac (`.dylib`) and Windows (`.dll`) native libraries are present in `lib/`. This means the graphical application cannot run on Linux — it fails with `DllNotFoundException: sgsdk.dll`. Building and unit testing work fine.
- The compiler warning `CS0169` about `_gameTimer` being unused is expected — it's a TODO placeholder in `Snap.cs`.
- The `Deck.Shuffle()` method is a stub (TODO in the code).

### Lint

There is no separate linter configured. The `mcs` compiler warnings during `./build.sh` serve as the primary static analysis.
