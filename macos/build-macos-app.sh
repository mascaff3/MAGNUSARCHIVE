#!/bin/zsh
set -euo pipefail
setopt null_glob

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/build"
APP_NAME="Archive Survival"
APP_DIR="$BUILD_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
WWW_DIR="$RESOURCES_DIR/www"
EXECUTABLE_NAME="ArchiveSurvival"
MODULE_CACHE_DIR="$BUILD_DIR/swift-module-cache"
SDK_PATH="${SDKROOT:-}"
SWIFTC_ARGS=()
APP_WEB_BUILD_DIR="$BUILD_DIR/app-web"
ICON_RENDER_SCRIPT="$SCRIPT_DIR/generate-app-icon.swift"
ICON_WORK_DIR="$BUILD_DIR/app-icon.iconset"
ICON_SOURCE_PNG="$BUILD_DIR/app-icon-source.png"
ICON_NAME="$EXECUTABLE_NAME.icns"
ICON_DEST="$RESOURCES_DIR/$ICON_NAME"

mkdir -p "$MACOS_DIR" "$WWW_DIR" "$RESOURCES_DIR" "$MODULE_CACHE_DIR" "$APP_WEB_BUILD_DIR"

if [[ -z "$SDK_PATH" ]]; then
  SDK_PATH="$(/usr/bin/xcrun --sdk macosx --show-sdk-path 2>/dev/null || true)"
fi

if [[ "$SDK_PATH" == /Library/Developer/CommandLineTools/* ]] && [[ -d /Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk ]]; then
  SDK_PATH="/Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk"
fi

if [[ -n "$SDK_PATH" ]]; then
  SWIFTC_ARGS+=(-sdk "$SDK_PATH")
fi

PATH="$PROJECT_DIR/.local/node/bin:$PATH"
if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
  echo "Missing node_modules. Run 'zsh scripts/use-local-toolchain.sh pnpm install' first." >&2
  exit 1
fi

resolve_esbuild_bin() {
  local candidate=""
  local candidates=(
    $PROJECT_DIR/node_modules/.pnpm/@esbuild+*/node_modules/@esbuild/*/bin/esbuild
    $PROJECT_DIR/node_modules/.pnpm/esbuild@*/node_modules/esbuild/node_modules/.bin/esbuild
    "$PROJECT_DIR/node_modules/.bin/esbuild"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  return 1
}

ESBUILD_BIN="$(resolve_esbuild_bin || true)"

if [[ -z "$ESBUILD_BIN" ]]; then
  echo "Missing esbuild binary. Run 'zsh scripts/use-local-toolchain.sh pnpm install' first." >&2
  exit 1
fi

"$ESBUILD_BIN" \
  "$PROJECT_DIR/src/main.js" \
  --bundle \
  --format=esm \
  --platform=browser \
  --target=safari16 \
  --outfile="$APP_WEB_BUILD_DIR/app.js"

if [[ ! -f "$ICON_RENDER_SCRIPT" ]]; then
  echo "Missing icon renderer: $ICON_RENDER_SCRIPT" >&2
  exit 1
fi

rm -rf "$ICON_WORK_DIR"
mkdir -p "$ICON_WORK_DIR"

CLANG_MODULE_CACHE_PATH="$MODULE_CACHE_DIR" swift "$ICON_RENDER_SCRIPT" "$ICON_SOURCE_PNG"

for icon_spec in \
  "16:icon_16x16.png" \
  "32:icon_16x16@2x.png" \
  "32:icon_32x32.png" \
  "64:icon_32x32@2x.png" \
  "128:icon_128x128.png" \
  "256:icon_128x128@2x.png" \
  "256:icon_256x256.png" \
  "512:icon_256x256@2x.png" \
  "512:icon_512x512.png" \
  "1024:icon_512x512@2x.png"
do
  icon_size="${icon_spec%%:*}"
  icon_file="${icon_spec#*:}"
  sips -z "$icon_size" "$icon_size" "$ICON_SOURCE_PNG" --out "$ICON_WORK_DIR/$icon_file" >/dev/null
done

iconutil --convert icns --output "$ICON_DEST" "$ICON_WORK_DIR"

cp "$PROJECT_DIR/index.html" "$APP_WEB_BUILD_DIR/index.html"
perl -0pi -e 's#<script type="module" src="\./src/main\.js"></script>#<script type="module" src="./app.js"></script>#g' "$APP_WEB_BUILD_DIR/index.html"
cp "$PROJECT_DIR/public/boot-loader.js" "$APP_WEB_BUILD_DIR/boot-loader.js"

swiftc \
  "$SCRIPT_DIR/ArchiveSurvivalApp.swift" \
  "${SWIFTC_ARGS[@]}" \
  -module-cache-path "$MODULE_CACHE_DIR" \
  -framework AppKit \
  -framework WebKit \
  -o "$MACOS_DIR/$EXECUTABLE_NAME"

/usr/bin/plutil -convert xml1 -o "$CONTENTS_DIR/Info.plist" - <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>ArchiveSurvival</string>
  <key>CFBundleIdentifier</key>
  <string>local.masoncaffrey.archive-survival</string>
  <key>CFBundleIconFile</key>
  <string>ArchiveSurvival.icns</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Archive Survival</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

rm -rf "$WWW_DIR"/*
cp "$APP_WEB_BUILD_DIR/index.html" "$WWW_DIR/index.html"
cp "$APP_WEB_BUILD_DIR/boot-loader.js" "$WWW_DIR/boot-loader.js"
cp "$APP_WEB_BUILD_DIR/app.js" "$WWW_DIR/app.js"
cp "$PROJECT_DIR/styles.css" "$WWW_DIR/styles.css"
cp -R "$PROJECT_DIR/assets" "$WWW_DIR/assets"

touch "$APP_DIR"
echo "Built: $APP_DIR"
