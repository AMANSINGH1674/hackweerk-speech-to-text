"use client"

import { useState, useRef, useCallback } from "react"
import { Mic, MicOff, Trash2 } from "lucide-react"

export default function VoiceTranscriber() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = useCallback(async () => {
    try {
      setError("")
      chunksRef.current = []

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsProcessing(true)
        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })

          // Send to our API route
          const response = await fetch("/api/deepgram", {
            method: "POST",
            body: audioBlob,
          })

          if (!response.ok) {
            throw new Error("Transcription failed")
          }

          const result = await response.json()

          if (result.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
            const newTranscript = result.results.channels[0].alternatives[0].transcript
            setTranscript((prev) => prev + newTranscript + " ")
          }
        } catch (error) {
          console.error("Transcription error:", error)
          setError("Failed to transcribe audio. Please try again.")
        } finally {
          setIsProcessing(false)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error starting recording:", err)
      setError("Failed to access microphone. Please allow microphone permissions.")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }

    setIsRecording(false)
  }, [])

  const clearTranscript = () => {
    setTranscript("")
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Space background with stars */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-black">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(2px 2px at 20px 30px, #fff, transparent),
                           radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
                           radial-gradient(1px 1px at 90px 40px, #fff, transparent),
                           radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
                           radial-gradient(2px 2px at 160px 30px, #fff, transparent)`,
            backgroundRepeat: "repeat",
            backgroundSize: "200px 100px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-4">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Voice Transcriber
          </h1>
          <p className="text-lg text-gray-300">Powered by Deepgram AI • Real-time speech-to-text</p>
        </div>

        {/* Main control card with glassmorphism */}
        <div className="mb-6 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
          <div className="p-8 text-center">
            <h2 className="text-2xl font-semibold text-white mb-2 flex items-center justify-center gap-2">
              <Mic className="w-6 h-6 text-blue-400" />
              Voice Transcription
            </h2>
            <p className="text-gray-300 mb-6">Click to record, then click again to transcribe</p>

            <div className="flex justify-center items-center gap-4 mb-6">
              <button
                onClick={toggleRecording}
                disabled={isProcessing}
                className={`w-24 h-24 rounded-full text-white font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center ${
                  isRecording
                    ? "bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50 animate-pulse"
                    : isProcessing
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/50"
                      : "bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70"
                }`}
              >
                {isProcessing ? (
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : isRecording ? (
                  <MicOff className="w-10 h-10" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>

              {transcript && (
                <button
                  onClick={clearTranscript}
                  className="px-4 py-2 backdrop-blur-md bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isRecording
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : isProcessing
                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                      : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                }`}
              >
                {isRecording ? "🔴 Recording..." : isProcessing ? "⚡ Processing..." : "⚪ Ready"}
              </span>
            </div>

            {error && (
              <div className="mt-4 text-center text-red-300 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg backdrop-blur-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Transcription card with glassmorphism */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-2">Transcription</h3>
            <p className="text-gray-300 mb-4">Your speech will appear here after processing</p>

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Record your voice and click stop to see transcription here..."
              className="w-full min-h-[300px] text-lg leading-relaxed resize-none bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            />

            <div className="mt-3 text-sm text-gray-400 flex justify-between">
              <span>
                Words:{" "}
                <span className="text-blue-400 font-medium">
                  {
                    transcript
                      .trim()
                      .split(/\s+/)
                      .filter((word) => word.length > 0).length
                  }
                </span>
              </span>
              <span>
                Characters: <span className="text-purple-400 font-medium">{transcript.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
