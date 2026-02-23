# Otter Web Extension

A universal browser extension for saving pages to [Otter](https://github.com/mrmartineau/otter), a simple bookmark manager. This extension works on both Chrome and Firefox browsers.

## Features

- 🦦 Save pages to Otter with one click
- ⌨️ Keyboard shortcuts for quick actions
- 🔧 Configurable Otter instance URL
- 📱 Choose between popup or tab for new bookmarks
- 🌐 Cross-browser compatibility (Chrome & Firefox)
- 🎯 Context menu integration
- 💾 Cross-device settings sync

## Installation

1. Clone this repository
2. Navigate to this directory: `packages/web-extension`
3. Install dependencies: `npm install`
4. Build the extension: `npm run build`
5. Load the extension in your browser:

### Chrome

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load Unpacked"
4. Select the `dist/chrome` directory

### Firefox

1. Go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `dist/firefox/manifest.json` file

## Development

### Scripts

| Script | Description |
| --- | --- |
| `npm run build` | Build for both Chrome and Firefox |
| `npm run build:chrome` | Build only for Chrome |
| `npm run build:firefox` | Build only for Firefox |
| `npm run dev:chrome` | Development build with watch for Chrome |
| `npm run dev:firefox` | Development build with watch for Firefox |
| `npm run format` | Format code with Prettier |

### Project Structure

```
web-extension/
├── src/                    # Shared source code
│   ├── background.js       # Background script (service worker)
│   ├── contentScript.js    # Content script
│   ├── popup.js            # Popup interface
│   ├── options.js          # Options page logic
│   ├── getStorageItems.js  # Storage utility
│   └── browser-api.js      # Cross-browser API wrapper
├── public/                 # Shared static assets
│   ├── icons/              # Extension icons
│   ├── options.html        # Options page
│   └── popup.html          # Popup page
├── manifests/              # Browser-specific manifests
│   ├── base.json           # Base manifest
│   ├── chrome.json         # Chrome-specific settings
│   └── firefox.json        # Firefox-specific settings
├── config/                 # Build configuration
│   ├── webpack.config.js   # Webpack config
│   └── build.js            # Multi-browser build script
└── dist/                   # Build output
    ├── chrome/
    └── firefox/
```

## Cross-Browser Compatibility

The extension uses the WebExtensions API with `webextension-polyfill` to provide a unified `browserAPI` across Chrome and Firefox. Browser-specific manifest differences are handled via separate manifest files in `manifests/` that are merged at build time.

## Contributing

Contributions are welcome! Please test in both Chrome and Firefox before submitting a pull request.

## License

[MIT](https://choosealicense.com/licenses/mit/) © [Zander Martineau](https://zander.wtf)

---

> Made by Zander • [zander.wtf](https://zander.wtf) • [GitHub](https://github.com/mrmartineau/) • [Mastodon](https://main.elk.zone/toot.cafe/@zander)
