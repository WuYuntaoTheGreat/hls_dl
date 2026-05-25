# hls_dl

A TypeScript-based HLS (HTTP Live Streaming) downloader.

## Installation

Install directly from the Git repository (no npmjs.org required):

```bash
npm install -g git+ssh://git@gitee.com:wu-yuntao/hls_dl.git
```

Or via HTTPS:

```bash
npm install -g git+https://gitee.com/wu-yuntao/hls_dl.git
```

## Update

To update to the latest version, simply reinstall:

```bash
npm install -g git+ssh://git@gitee.com:wu-yuntao/hls_dl.git
```

Or force a fresh install:

```bash
npm uninstall -g hls_dl
npm install -g git+ssh://git@gitee.com:wu-yuntao/hls_dl.git
```

## Usage

### `hls_dl` — Download HLS streams

```bash
# Read m3u8 URL from clipboard
hls_dl

# Use a local script file
hls_dl -s ./playlist.m3u8

# Select low bandwidth, 4 download threads
hls_dl -b l -t 4

# Clear previous download job
hls_dl -c
```

Options:

| Option | Description |
|--------|-------------|
| `-c, --clear` | Clear previous download job |
| `-s, --script <file>` | Use script file as URL source |
| `-b, --bandwidth <l\|h>` | Select bandwidth: `l` (low) or `h` (high), default: `h` |
| `-t, --thread <count>` | Number of download threads, default: `1` |
| `-h, --help` | Show help message |

Downloaded content is saved to `./.hls_dl/contents/`.

### `hls_dl-merge` — Merge downloaded segments into MP4

```bash
# Run in the same directory where hls_dl was executed
hls_dl-merge
```

This calls `ffmpeg` to merge the downloaded HLS segments into `out.mp4`.

Requirements:
- `ffmpeg` must be installed and available in your `PATH`.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npx ts-node src/index.ts
```
