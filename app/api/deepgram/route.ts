import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Get audio data from request
    const audioData = await request.arrayBuffer()

    // Send to Deepgram
    const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/wav",
      },
      body: audioData,
    })

    const result = await response.json()

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Deepgram API error:", error)
    return new Response(JSON.stringify({ error: "Transcription failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
