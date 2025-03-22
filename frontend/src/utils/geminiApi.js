// Gemini API utility functions
const GEMINI_API_KEY = "AIzaSyD_3CxbJNcn98no6K-VNRo_do-oT5oHzh0";
// Update to the newest stable model that is generally available
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/**
 * Makes a request to the Gemini API
 * @param {string} prompt - The user prompt to send to Gemini
 * @returns {Promise<string>} - The response text from Gemini
 */
export const askGemini = async (prompt) => {
  try {
    console.log("Sending prompt to Gemini:", prompt);
    
    // Check if we have an API key
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "") {
      throw new Error("Missing Gemini API key");
    }
    
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        }
      })
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("API error response:", errorBody);
      
      if (response.status === 403) {
        return "API key error: Make sure your Gemini API key is valid and has proper permissions.";
      } else if (response.status === 429) {
        return "Rate limit exceeded: Too many requests to the Gemini API.";
      }
      
      throw new Error(`Gemini API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Gemini API response:", data);
    
    // Extract the response text from Gemini
    if (data.candidates && 
        data.candidates[0] && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else if (data.promptFeedback && data.promptFeedback.blockReason) {
      // Handle content filtered by safety settings
      return `The prompt was blocked due to ${data.promptFeedback.blockReason}. Please modify your question.`;
    } else {
      console.error("Unexpected Gemini response format:", data);
      return "Sorry, I couldn't process that request. The response format was unexpected.";
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return `Sorry, there was an error: ${error.message}`;
  }
};

export default askGemini; 