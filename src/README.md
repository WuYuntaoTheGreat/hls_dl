# HLS_DL

HLS Downloader

## Prerequest
- node.js (with npm)
- ffmpeg in $PATH (optional)

## Installation

```bash
git clone https://gitee.com/wu-yuntao/hls_dl.git
cd hls_dl

npm i -g .
```

## Use

1. Open Website (using Chrome etc.,)
2. Open DevTool (using Ctrl+Shift+I or Cmd+Shift+I)
3. Select 'Network' tab
4. Right click on the master playlist file (.m3u8 file)
5. In the right click menu, select `Copy -> Copy as cURL (bash)`
6. Open terminal window, and `cd` to proper directory
7. Type `hls_dl`
