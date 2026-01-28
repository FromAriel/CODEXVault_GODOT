meta:
  id: askybin1
  title: ASkyVideo binary container (ASKYBIN1)
  doc: |
    Kaitai schema for the ASKYBIN1 payload (v1/v2/v3).

    If a file is gzip-wrapped (commonly saved as .asky.gz), gunzip first and
    then parse the decompressed bytes with this schema.
  file-extension: asky
  endian: le

seq:
  - id: magic
    contents: "ASKYBIN1"
  - id: version
    type: u1
  - id: hdr
    type:
      switch-on: version
      cases:
        1: header_v1
        2: header_v2
        3: header_v2
  - id: font_utf8
    type: str
    size: hdr.font_utf8_len
    encoding: utf-8
  - id: library_utf8
    type: str
    size: hdr.library_utf8_len
    encoding: utf-8
  - id: palette_codepoints
    type: u4
    repeat: expr
    repeat-expr: hdr.palette_count
  - id: seek_table
    type: seek_entry
    repeat: expr
    repeat-expr: hdr.seek_count
    if: version >= 2
  - id: frames
    type:
      switch-on: version
      cases:
        1: frame_v1
        2: frame_v2
        3: frame_v3
    repeat: expr
    repeat-expr: hdr.frame_count

types:
  header_v1:
    seq:
      - id: cols
        type: u2
      - id: rows
        type: u2
      - id: cell_px_w
        type: u1
      - id: cell_px_h
        type: u1
      - id: palette_id_width
        type: u1
      - id: flags
        type: u1
      - id: frame_count
        type: u4
      - id: palette_count
        type: u4
      - id: default_delay_ms
        type: u2
      - id: threshold
        type: u1
      - id: black_point
        type: u1
      - id: white_point
        type: u1
      - id: reserved0
        type: u1
      - id: gamma
        type: f4
      - id: font_utf8_len
        type: u2
      - id: library_utf8_len
        type: u2
    instances:
      keyframe_interval:
        value: 1
      seek_count:
        value: 0

  header_v2:
    seq:
      - id: cols
        type: u2
      - id: rows
        type: u2
      - id: cell_px_w
        type: u1
      - id: cell_px_h
        type: u1
      - id: palette_id_width
        type: u1
      - id: flags
        type: u1
      - id: frame_count
        type: u4
      - id: palette_count
        type: u4
      - id: default_delay_ms
        type: u2
      - id: threshold
        type: u1
      - id: black_point
        type: u1
      - id: white_point
        type: u1
      - id: reserved0
        type: u1
      - id: gamma
        type: f4
      - id: font_utf8_len
        type: u2
      - id: library_utf8_len
        type: u2
      - id: keyframe_interval
        type: u2
      - id: seek_count
        type: u4

  seek_entry:
    seq:
      - id: frame_index
        type: u4
      - id: file_offset
        type: u4

  frame_v1:
    seq:
      - id: delay_ms
        type: u2
      - id: rows
        type: row_v1
        repeat: expr
        repeat-expr: _root.hdr.rows

  frame_v2:
    seq:
      - id: delay_ms
        type: u2
      - id: frame_flags
        type: u1
      - id: rows
        type: row_v1
        repeat: expr
        repeat-expr: _root.hdr.rows
        if: is_keyframe
      - id: changed_bitset
        type: u1
        repeat: expr
        repeat-expr: (_root.hdr.rows + 7) / 8
        if: is_keyframe == false
      - id: row_updates
        type: delta_row_update_v2
        repeat: expr
        repeat-expr: _root.hdr.rows
        if: is_keyframe == false
    instances:
      is_keyframe:
        value: (frame_flags & 1) != 0

  delta_row_update_v2:
    seq:
      - id: row
        type: row_v1
        if: ((_parent.changed_bitset[_index / 8] >> (_index % 8)) & 1) != 0

  row_v1:
    seq:
      - id: run_count
        type: u2
      - id: runs
        type: run_v1
        repeat: expr
        repeat-expr: run_count

  run_v1:
    seq:
      - id: count
        type: u2
      - id: palette_id
        type:
          switch-on: _root.hdr.palette_id_width
          cases:
            1: u1
            2: u2
            4: u4

  frame_v3:
    seq:
      - id: delay_ms
        type: vlq_base128_le
      - id: frame_flags
        type: u1
      - id: rows
        type: row_v3
        repeat: expr
        repeat-expr: _root.hdr.rows
        if: is_keyframe
      - id: changed_bitset
        type: u1
        repeat: expr
        repeat-expr: (_root.hdr.rows + 7) / 8
        if: is_keyframe == false
      - id: row_updates
        type: delta_row_update_v3
        repeat: expr
        repeat-expr: _root.hdr.rows
        if: is_keyframe == false
    instances:
      is_keyframe:
        value: (frame_flags & 1) != 0

  delta_row_update_v3:
    seq:
      - id: row
        type: row_v3
        if: ((_parent.changed_bitset[_index / 8] >> (_index % 8)) & 1) != 0

  row_v3:
    seq:
      - id: run_count
        type: vlq_base128_le
      - id: runs
        type: run_v3
        repeat: expr
        repeat-expr: run_count

  run_v3:
    seq:
      - id: count
        type: vlq_base128_le
      - id: palette_id
        type:
          switch-on: _root.hdr.palette_id_width
          cases:
            0: vlq_base128_le
            1: u1
            2: u2
            4: u4
