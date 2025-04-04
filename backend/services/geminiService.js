const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Process an image with Gemini 2.0 Flash API for OCR
 * @param {string} imageBase64 - Base64 encoded image data
 * @returns {Promise<Object>} - OCR results with dialogue and speakers
 */
async function processImageOCR(imageBase64) {
  try {
    // Remove the data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    // Create a model instance
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Prepare the image data
    const imageData = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    };
    
    // Create the prompt for OCR
    const prompt = `
      You are an OCR AI specialized in comic speech bubbles. 
      Given this web comic panel, detect all speech bubble dialogue in reading order.
      If you can identify the speaker, associate their name with the dialogue.
      
      Output as a JSON array like this:
      [
        { "speaker": "Character Name", "dialogue": "The text in the speech bubble" },
        { "speaker": "Unknown", "dialogue": "Text from another speech bubble" }
      ]
      
      Also, try to identify the positions of each speech bubble in the image as percentages of the image dimensions.
      Add a "position" field to each object with x, y, width, and height values (all as decimals between 0 and 1).
      
      For example:
      [
        { 
          "speaker": "Character Name", 
          "dialogue": "The text in the speech bubble",
          "position": { "x": 0.2, "y": 0.3, "width": 0.3, "height": 0.1 }
        }
      ]
      
      If you cannot determine the position, omit the position field.
      Only output the JSON array, nothing else.
    `;
    
    // Generate content with the model
    const result = await model.generateContent([prompt, imageData]);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON array found, try parsing the whole response
      return JSON.parse(text);
    } catch (parseError) {
      console.error('Error parsing OCR result:', parseError);
      
      // Fallback: If parsing fails, return a structured error
      return [{ 
        speaker: 'Error', 
        dialogue: 'Could not parse OCR results. Raw output: ' + text.substring(0, 100) + '...'
      }];
    }
  } catch (error) {
    console.error('Error processing image with Gemini API:', error);
    throw new Error('Failed to process image with OCR: ' + error.message);
  }
}

module.exports = {
  processImageOCR
};
