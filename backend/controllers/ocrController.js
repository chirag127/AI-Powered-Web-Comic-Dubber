const geminiService = require('../services/geminiService');

/**
 * Controller function to handle image processing and OCR requests.
 * Expects image data (base64 or URL) in the request body.
 */
async function processImageForOcr(req, res, next) {
  console.log("Received request body:", req.body); // Log carefully in production

  const { imageUrl, imageBase64 } = req.body;

  if (!imageUrl && !imageBase64) {
    return res.status(400).json({ error: 'Missing image data. Provide either imageUrl or imageBase64.' });
  }

  try {
    let imageData;
    let imageMimeType;

    if (imageBase64) {
      // Basic validation and extraction for base64
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.*)$/);
      if (!match) {
        return res.status(400).json({ error: 'Invalid base64 image format. Expected data:image/...' });
      }
      imageMimeType = match[1];
      imageData = match[2];
      console.log(`Processing base64 image (${imageMimeType})`);
    } else if (imageUrl) {
      // TODO: Implement proxying/fetching image from URL if needed.
      // For security, directly processing external URLs on the backend is risky.
      // A safer approach is for the frontend to fetch and send base64.
      // If URL processing is required, ensure proper validation and security measures.
      console.log(`Processing image URL: ${imageUrl} (URL processing not fully implemented)`);
      // Placeholder: Assume we need to fetch and convert it
      // imageData = await fetchAndEncodeImage(imageUrl); // Implement this function securely
      // imageMimeType = 'image/png'; // Or detect from fetched data
       return res.status(501).json({ error: 'Image URL processing is not yet implemented securely.' });
    }

    // Call the Gemini service to perform OCR
    const ocrResult = await geminiService.getOcrFromImage(imageData, imageMimeType);

    // Send the successful OCR result back to the client
    res.status(200).json(ocrResult);

  } catch (error) {
    console.error('Error processing image for OCR:', error);
    // Pass error to the centralized error handler in server.js
    // or send a specific error response
    res.status(500).json({ error: 'Failed to process image for OCR.', details: error.message });
    // next(error); // Alternatively, use the central handler
  }
}

// Placeholder/Example for fetching URL (Needs proper implementation and security)
// async function fetchAndEncodeImage(url) {
//   try {
//     const response = await fetch(url); // Use a library like 'node-fetch' or 'axios'
//     if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
//     const buffer = await response.buffer(); // Or blob() depending on library
//     return buffer.toString('base64');
//   } catch (error) {
//     console.error(`Error fetching image from URL ${url}:`, error);
//     throw new Error(`Could not fetch image from URL.`);
//   }
// }


module.exports = {
  processImageForOcr,
};
