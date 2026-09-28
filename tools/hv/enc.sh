#!/bin/zsh
FF=/private/tmp/claude-501/-Users-kimsejun-Documents-projects/935de4bf-bfbc-461c-b581-375b998d255a/scratchpad/pylib/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1
S=/private/tmp/claude-501/-Users-kimsejun-Documents-projects/935de4bf-bfbc-461c-b581-375b998d255a/scratchpad/hv
SRC="/Users/kimsejun/Documents/projects/asd_website/assets/25_ADEX_대한항공_개별기체 (비율편집).mp4"
cd $S
e(){ $FF -y -hide_banner -loglevel error -i "$SRC" -filter_complex_script fc$1.txt -map "[v]" -an -c:v libx264 -preset slow -b:v $2k -pass 1 -passlogfile pl$1 -f mp4 /dev/null && \
     $FF -y -hide_banner -loglevel error -i "$SRC" -filter_complex_script fc$1.txt -map "[v]" -an -c:v libx264 -preset slow -b:v $2k -maxrate $(($2*2))k -bufsize $(($2*4))k -pass 2 -passlogfile pl$1 -movflags +faststart hero-$1.mp4 && echo done $1 $(stat -f %z hero-$1.mp4); }
e 1600 760 & e 800 280 & wait
$FF -y -hide_banner -loglevel error -ss 4 -i hero-1600.mp4 -frames:v 1 -c:v libwebp -quality 78 hero-poster.webp && echo poster
