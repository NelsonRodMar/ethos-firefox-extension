# Ethos Network Firefox Extension (Unofficial)

An unofficial Firefox extension that displays [Ethos Network](https://ethos.network) credibility scores directly on X (formerly Twitter) profiles and posts. The extension automatically fetches and displays Ethos scores next to usernames, helping you quickly assess the credibility of accounts you encounter.

## Features

- **Automatic Score Display**: Shows Ethos credibility scores next to usernames
- **Color-Coded Scores**: Visual indicators with color coding based on score ranges from the official score matrix
- **Smart Detection**: Correctly identifies usernames in various contexts:
  - Profile pages
  - Timeline posts
  - Reposts (shows scores for both reposter and original author)
  - User cards and mentions
- **No Clutter**: Only displays scores when available, no boxes shown for users without Ethos scores
- **Real-time Updates**: Automatically updates scores when navigating between profiles

## Installation

### Temporary Installation (Development)

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on…"**
4. Select the `manifest.json` file from this project directory
5. Visit any X profile or timeline - the extension will automatically start displaying Ethos scores

The extension will remain active until you restart Firefox. Repeat these steps after making code changes.

### Packaging for Distribution

To create a ZIP archive for distribution:

```bash
zip -r ethos-firefox-extension.zip manifest.json app.js background.js icons/
```

**Important**: Ensure `manifest.json` is at the root of the archive, otherwise Firefox will report "does not contain a valid manifest."

## How It Works

### Architecture

The extension consists of two main components:

1. **Content Script (`app.js`)**: 
   - Runs on X.com pages
   - Detects username containers in the DOM
   - Extracts usernames from various contexts (profiles, tweets, reposts)
   - Injects score boxes next to usernames
   - Handles X's SPA navigation and dynamic content loading
   - Handles API communication with Ethos Network API `https://api.ethos.network/api`

### Username Detection

The extension uses multiple methods to accurately identify usernames:

1. **@username text extraction**: Primary method - extracts `@username` from container text content
2. **DOM structure analysis**: Finds username links in the same structural section as the container
3. **URL-based fallback**: Uses page URL for profile pages

This ensures accurate username detection even in complex scenarios like reposts where multiple usernames exist in the same article.

### Score Display

- Scores are fetched from the Ethos API for each detected username
- Boxes are color-coded based on score ranges and official color matrix 
- If no score is available, no box is displayed (clean interface)
- Scores update automatically when navigating between profiles

## API Integration

The extension uses the [Ethos Network API v2](https://developers.ethos.network/api-documentation/):

- **Endpoint**: `POST https://api.ethos.network/api/v2/users/by/x`
- **Method**: POST request with `accountIdsOrUsernames` array
- **Response**: User data including `score`, `displayName`, `username`, and other profile information

## Development

### Project Structure

```
ethos-firefox-extension/
├── manifest.json          # Extension manifest (Manifest V2)
├── app.js                 # Content script (runs on X.com pages)
├── icons/
│   └── ethos-logo-unofficial.png
└── README.md
```

### Key Technologies

- **Manifest V2**: Firefox-compatible extension format
- **DOM MutationObserver**: Detects dynamic content changes
- **Fetch API**: HTTP requests to Ethos API

### Development Workflow

1. Make changes to `app.js`
2. Reload the temporary add-on in Firefox (`about:debugging#/runtime/this-firefox`)
3. Refresh X.com pages to see changes
4. Check browser console for debugging (Tools → Browser Tools → Browser Console)

### Debugging

- **Content Script Logs**: Open Developer Tools (F12) on X.com pages
- **Network Requests**: Check Network tab in Developer Tools for API calls

## Browser Compatibility

- **Firefox 115+**: Primary target browser
- **Manifest V2**: Compatible with Firefox and other browsers supporting Manifest V2

## Permissions

The extension requires:
- `https://api.ethos.network/*`: To fetch Ethos scores from the API

No other permissions are required - the extension only accesses X.com pages and the Ethos API.

## Limitations

- **No Caching**: Scores are fetched fresh for each request (caching was removed per user preference)
- **API Rate Limits**: Subject to Ethos Network API rate limits
- **X DOM Changes**: May require updates if X changes their DOM structure

## Contributing

This is an unofficial extension. Contributions and improvements are welcome! Please ensure any changes maintain compatibility with Firefox and follow the existing code style.


## Acknowledgments

- [Ethos Network](https://ethos.network) for providing the credibility scoring API
- Inspired by the [Ethos Everywhere](https://chromewebstore.google.com/detail/ethos-everywhere/jblacjfeljfigeglloiclnoehlhnmgne) Chrome extension

## Support

For issues, questions, or contributions, please open an issue in the repository.

## Support Me

This is an open source and free extension, but if you want to support me the best way is to buy my creator coin [$nelsonrodmar](https://swap.cow.fi/#/8453/swap/WETH/0xf6620d7a9d5cd020ce294a923aa40324576f8776) on Base `0xf6620d7a9d5cd020ce294a923aa40324576f8776`

---

**Note**: This is an unofficial extension and is not affiliated with or endorsed by Ethos Network or X (Twitter).

