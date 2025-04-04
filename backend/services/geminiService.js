const fetch = require('node-fetch'); // Using node-fetch v2 for CommonJS compatibility if needed, or ensure project is ESM

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_FLASH_MODEL = "google/gemini-flash-1.5"; // Or the specific model identifier on OpenRouter
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// The prompt template defined in the PRD
const OCR_PROMPT_TEMPLATE = `You are an OCR AI specialized in web comics. Given this comic panel image, detect all speech bubble dialogue in the correct reading order (usually left-to-right, top-to-bottom within a standard panel). If you can reasonably guess the speaker based on context (like tail direction or previous panels, though you only see one here), associate their name. If the speaker is unclear, use "Unknown" or "Narrator" if it's clearly narration text.

Output *only* a valid JSON list containing objects, where each object has a "speaker" and "dialogue" key. Example format:
[
  { "speaker": "Alice", "dialogue": "Hi Bob!" },
  { "speaker": "Bob", "dialogue": "Hey Alice!" },
  { "speaker": "Narrator", "dialogue": "Later that day..." }
]

Do not include any other text, explanations, or markdown formatting around the JSON output.`;

/**
 * Sends image data to Google Gemini Flash via OpenRouter for OCR.
 * @param {string} imageBase64Data The base64 encoded image data (without the data:image/... prefix).
 * @param {string} mimeType The MIME type of the image (e.g., 'image/png', 'image/jpeg').
 * @returns {Promise<Array<object>>} A promise that resolves to the parsed JSON array of speaker/dialogue objects.
 */
async function getOcrFromImage(imageBase64Data, mimeType) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key (OPENROUTER_API_KEY) is not configured in environment variables.");
  }
  if (!imageBase64Data || !mimeType) {
    throw new Error("Missing image data or MIME type for OCR processing.");
  }

  console.log(`Sending image (${mimeType}) to Gemini Flash via OpenRouter for OCR...`);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Optional headers recommended by OpenRouter
        // "HTTP-Referer": $YOUR_SITE_URL, // Optional, for tracking
        // "X-Title": $YOUR_SITE_NAME // Optional, for tracking
      },
      body: JSON.stringify({
        model: GEMINI_FLASH_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: OCR_PROMPT_TEMPLATE },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64Data}`
                }
              }
            ]
          }
        ],
        // Optional parameters (temperature, max_tokens, etc.)
        // max_tokens: 1000, // Adjust as needed
        // temperature: 0.5, // Adjust for creativity vs determinism
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("OpenRouter API Error Response:", errorBody);
      throw new Error(`OpenRouter API request failed: ${response.status} ${response.statusText}. Body: ${errorBody}`);
    }

    const result = await response.json();
    console.log("Raw OpenRouter Response:", JSON.stringify(result, null, 2)); // Log the full response for debugging

    if (!result.choices || result.choices.length === 0 || !result.choices[0].message?.content) {
        throw new Error("Invalid response structure received from OpenRouter API.");
    }

    const rawContent = result.choices[0].message.content.trim();

    // Attempt to parse the JSON content directly
    try {
        // Clean potential markdown code fences
        const jsonContent = rawContent.replace(/^```json\s*|```$/g, '').trim();
        const parsedJson = JSON.parse(jsonContent);
        console.log("Successfully parsed OCR JSON:", parsedJson);
        // Basic validation: check if it's an array
        if (!Array.isArray(parsedJson)) {
            throw new Error("Parsed content is not a JSON array.");
        }
        // Optional: Further validation of array items structure
        parsedJson.forEach((item, index) => {
            if (typeof item !== 'object' || item === null || !item.hasOwnProperty('speaker') || !item.hasOwnProperty('dialogue')) {
                throw new Error(`Invalid item structure at index ${index}: ${JSON.stringify(item)}`);
            }
        });
        return parsedJson;
    } catch (parseError) {
        console.error("Failed to parse JSON response from Gemini:", parseError);
        console.error("Raw content received:", rawContent);
        throw new Error(`Failed to parse OCR result as valid JSON. Received: ${rawContent}`);
    }

  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    // Re-throw the error to be caught by the controller
    throw error;
  }
}

module.exports = {
  getOcrFromImage,
};
