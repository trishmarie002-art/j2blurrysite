import { GoogleGenAI } from "@google/genai";

async function getInstagramImages() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Find the image URLs for the most recent posts from the Instagram profile https://www.instagram.com/jay.2blurry/. Return them as a JSON array of strings.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  console.log(response.text);
  console.log(JSON.stringify(response.candidates?.[0]?.groundingMetadata?.groundingChunks, null, 2));
}

getInstagramImages();
