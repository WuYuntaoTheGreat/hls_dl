#!/bin/bash

# Remove lines for 0000.ts through 0011.ts and their preceding #EXTINF lines
#sed -i '/#EXTINF/{N;/000[0-9]\.ts\|001[01]\.ts/d}' ./out/index.m3u8
#sed -i '/000[0-9]\.ts/d; /001[01]\.ts/d' ./out/index.m3u8

CONTENT_DIR=./.hls_dl/contents
MASTER=/${CONTENT_DIR}/index.m3u8
VIDEO=/${CONTENT_DIR}/video.m3u8
OUTPUT=./out.mp4

INPUT="$MASTER"
if [ ! -f "$MASTER" ]; then
    INPUT="$VIDEO"
fi

ffmpeg -allowed_extensions ALL -i "$INPUT" -c copy "$OUTPUT"

