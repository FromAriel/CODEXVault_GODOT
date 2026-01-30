# ASKYVIDEO .asky container format (binary, v3)

Status: implemented
Scope: compact binary container for glyph-grid animations (palette + per-row RLE, with keyframes + row-delta frames)

The file is not human-editable. It is designed to:

- compress well (RLE + keyframes/deltas + varints)
- decode fast (simple little-endian structs)
- be easy to decode in a webapp (ArrayBuffer + DataView)

Notes:
- The writer produces binary version 3 (this document).
- The reader still supports binary versions 1 and 2, and a legacy early prototype text format ("ASKYVIDEO 1").
- The file may optionally be gzip-wrapped for distribution (see section 10).

Machine-readable schema: see `ASKYBIN1.ksy` (Kaitai Struct).

-------------------------------------------------------------------------------

## 1. Overview

A .asky file stores:

- header (grid size + encoder settings)
- palette: palette_id -> Unicode codepoint (u32)
- frames: delay + rows of RLE runs over palette IDs

Frames store palette IDs, not raw characters.

-------------------------------------------------------------------------------

## 2. Byte order and types

- All multi-byte integers are little-endian.
- u8, u16, u32 are unsigned integers.
- uvarint is unsigned LEB128 (variable-length base-128 integer).
- f32 is IEEE-754 float32.
- Strings are UTF-8 with u16 byte length prefix.

-------------------------------------------------------------------------------

## 3. File structure (binary)

0) Magic
1) Version (u8)
2) Fixed header struct
3) UTF-8 strings: font, library (optional but written by encoder)
4) Palette (palette_count * u32 codepoints)
5) Seek table (seek_count entries)
6) Frames (frame_count blocks)
7) End of file

-------------------------------------------------------------------------------

## 4. Magic and version

Magic bytes (8 bytes):

ASKYBIN1

Version (u8):

03

So the first 9 bytes are:

41 53 4B 59 42 49 4E 31 03
^ magic is 8 bytes, then 1 byte version

-------------------------------------------------------------------------------

## 5. Fixed header struct

Immediately after the version byte:

HeaderV3 (36 bytes):

offset  type  name
0       u16   cols
2       u16   rows
4       u8    cell_px_w            (must be 8)
5       u8    cell_px_h            (must be 16)
6       u8    palette_id_width     (0 = uvarint palette ids; else 1, 2, or 4 fixed bytes)
7       u8    flags                (reserved, currently 0)
8       u32   frame_count
12      u32   palette_count
16      u16   default_delay_ms
18      u8    threshold
19      u8    black_point
20      u8    white_point
21      u8    reserved0            (0)
22      f32   gamma
26      u16   font_utf8_len
28      u16   library_utf8_len
30      u16   keyframe_interval     (>= 1; keyframe every N frames)
32      u32   seek_count            (number of seek table entries)

After the fixed header:

- font_utf8 bytes (length = font_utf8_len)
- library_utf8 bytes (length = library_utf8_len)

-------------------------------------------------------------------------------

## 6. Palette section

After the strings:

palette_count entries, each:

- u32 codepoint (Unicode scalar value 0..10FFFF)

Palette entry i corresponds to palette_id i.

-------------------------------------------------------------------------------

## 7. Seek table section

After the palette:

seek_count entries, each:

- u32 frame_index
- u32 file_offset (absolute byte offset from start of file)

Writer behavior (v3):

- Entries point to keyframes (frame 0, then every keyframe_interval frames).
- file_offset points to the start of the frame block (the delay_ms field).

-------------------------------------------------------------------------------

## 8. Frame section

For each frame (frame_count frames, in order):

FrameV3:

- uvarint delay_ms
- u8 frame_flags
  - bit0 (1): keyframe

Delay semantics:

- If delay_ms == 0, decoders should treat it as "use header.default_delay_ms".
  (Encoders may use this to save bytes when many frames share the default delay.)

If keyframe (bit0 set):

- for each row (rows rows):
  - uvarint run_count
  - run_count runs:
    - uvarint count
    - palette_id:
      - if palette_id_width == 0: uvarint
      - else: palette_id_width bytes, little-endian

If delta frame (bit0 not set):

- row_changed_bitset: u8[ceil(rows/8)]
  - bit i corresponds to row i
  - bit order is LSB-first: (byte_index = i//8, bit = 1 << (i%8))
- then, for each row i where bit i == 1, row payload:
  - uvarint run_count
  - run_count runs:
    - uvarint count
    - palette_id (same encoding rules as keyframes)

Constraints:

- Each row's runs expand to exactly cols palette IDs (sum(count) == cols).
- palette_id must be in [0, palette_count-1].

-------------------------------------------------------------------------------

## 9. Web decode notes (high level)

In a webapp:

- fetch the file as ArrayBuffer
- parse with DataView (little-endian)
- palette is an array of codepoints (u32)
- for v3, keyframes decode full rows; delta frames reuse previous rows and only decode changed rows
- translate palette IDs to codepoints, then to JS strings (String.fromCodePoint)

For performance, keep decoded frame grids as palette-id arrays and only convert
to strings when rendering.

-------------------------------------------------------------------------------

## 10. Optional outer gzip wrapper

For distribution, you can gzip-compress the entire `.asky` file (commonly saved
as `.asky.gz`). The decompressed payload is a normal ASKYBIN1 file starting
with the `ASKYBIN1` magic bytes.

Notes:
- The Python reader supports gzip-wrapped containers transparently.
- The web player can open gzip-wrapped files in browsers that support
  `DecompressionStream("gzip")`.
