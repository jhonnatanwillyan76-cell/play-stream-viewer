# Plan: Fix Video Format Support (HLS/TS)

The user reported that the video format is not supported. Many M3U links use `.ts` or `.m3u8` formats which native HTML5 `<video>` tags don't support in all browsers (like Chrome/PC).

## Proposed Changes

### Logic & Components
- **Integrate `hls.js`**: Add a robust HLS player to `TitlePage` to handle `.ts` and `.m3u8` streams.
- **Enhanced Video Component**: Create a `VideoPlayer` component that detects the source type and initializes HLS if needed.
- **UI Refinement**: Ensure the branding and fullscreen buttons remain functional and prominent.

## Technical Details
- Use `Hls.isSupported()` to check for compatibility.
- Attach `hls.js` instance to the video element for `.ts` and `.m3u8` URLs.
- Fallback to native `<video>` for standard formats like `.mp4`.
- Handle potential CORS issues by adding `crossOrigin="anonymous"` where appropriate.

## User Review Required
> [!IMPORTANT]
> The `.ts` files from M3U providers often require specific HTTP headers or have strict CORS policies. While `hls.js` solves the format issue, playback still depends on the provider's server allowing the request.
