# Troubleshooting Guide

If you're experiencing issues with the AI-Powered Web Comic Dubber extension, here are some common problems and their solutions:

## "Failed to load required libraries. Please refresh the page and try again."

This error occurs when the extension can't load the required libraries (OpenCV.js and Tesseract.js) needed for image processing and text recognition.

### Solutions:

1. **Refresh the page**: Sometimes a simple page refresh can resolve loading issues.

2. **Try on a different website**: Some websites have strict Content Security Policies (CSP) that prevent external scripts from loading. Try the extension on a different website.

3. **Check your internet connection**: The libraries are quite large and may fail to load on slow connections.

4. **Disable other extensions**: Other extensions might be interfering with the loading process.

5. **Try in incognito mode**: This can help identify if other extensions or browser settings are causing the issue.

6. **Clear browser cache**: Go to your browser settings and clear the cache, then try again.

## "Components not initialized. Please try again."

This error occurs when the extension can't properly initialize the required components (BubbleDetector, TextExtractor, or AudioPlayer).

### Solutions:

1. **Refresh the page**: Sometimes a simple page refresh can resolve initialization issues.

2. **Check console for errors**: Open the browser's developer tools (F12 or right-click > Inspect) and check the Console tab for specific error messages.

3. **Try on a different comic page**: Some websites have strict Content Security Policies that may prevent the extension from loading properly.

4. **Reinstall the extension**: Remove the extension and load it again using the "Load unpacked" option.

## "No comic images found on the page"

This error occurs when the extension can't find any images on the page that match its criteria for comic panels.

### Solutions:

1. **Make sure you're on a comic page**: The extension is designed to work on pages with comic images.

2. **Wait for images to load**: Make sure all images on the page are fully loaded before using the extension.

3. **Try on a different comic site**: The extension works best on pages with clear, distinct comic images.

## "No speech bubbles detected"

This error occurs when the extension can't find any speech bubbles in the comic images.

### Solutions:

1. **Try on a different comic**: The speech bubble detection works best on comics with clear, well-defined speech bubbles.

2. **Try a different image on the page**: Use the "Next Page" button to navigate to a different image that might have clearer speech bubbles.

## "Text extraction failed"

This error occurs when the OCR (Optical Character Recognition) fails to extract text from the detected speech bubbles.

### Solutions:

1. **Try on a comic with clearer text**: The OCR works best on comics with clear, printed text rather than handwritten text.

2. **Check if the speech bubbles are correctly detected**: If the speech bubbles are not correctly highlighted, the text extraction may fail.

## General Troubleshooting Steps

1. **Refresh the page**: This is often the simplest solution to many problems.

2. **Check for browser updates**: Make sure your browser is up to date.

3. **Disable other extensions**: Other extensions might interfere with this one.

4. **Check console for errors**: The browser's developer tools can provide valuable information about what's going wrong.

5. **Reinstall the extension**: Sometimes a fresh installation can resolve issues.

If you continue to experience problems, please report the issue with as much detail as possible, including:

-   The URL of the comic page you're trying to use
-   Any error messages from the console
-   Screenshots of what you're seeing
