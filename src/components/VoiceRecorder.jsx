import React, { useState, useRef, useEffect } from "react";
import {
  BsMic,
  BsMicMute,
  BsStop,
  BsPlay,
  BsTrash,
  BsSend,
} from "react-icons/bs";

function VoiceRecorder({ onVoiceSend, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // ✅ ADD THIS INSTEAD
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  const cancelRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
      setAudioURL(null);
      setRecordingDuration(0);
    }
  };

  // VoiceRecorder.jsx - Updated sendVoiceMessage function
  const sendVoiceMessage = async () => {
    if (!audioURL) return;

    setUploading(true);

    try {
      // Convert audio URL to blob
      const response = await fetch(audioURL);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("voice", blob, "recording.webm");
      formData.append("duration", recordingDuration);

      const token = localStorage.getItem("token");
      const uploadResponse = await fetch(`${API_URL}/voice/upload`, {
        method: "POST",
        headers: {
          "x-auth-token": token,
        },
        body: formData,
      });

      const data = await uploadResponse.json();
      console.log("📤 Voice upload response:", data);

      if (uploadResponse.ok && data.success) {
        // Call the onVoiceSend prop which should send the message via REST API
        await onVoiceSend(data.voiceUrl, data.duration);
        cancelRecording();
      } else {
        throw new Error(data.error || "Voice upload failed");
      }
    } catch (error) {
      console.error("Error sending voice message:", error);
      alert(error.message || "Failed to send voice message");
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (disabled) {
    return (
      <button className="text-gray-400 cursor-not-allowed" disabled>
        <BsMic size={22} />
      </button>
    );
  }

  if (audioURL) {
    return (
      <div className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-2">
        <audio ref={audioRef} src={audioURL} className="hidden" />
        <button
          onClick={playRecording}
          className="text-green-500 hover:text-green-400"
        >
          <BsPlay size={18} />
        </button>
        <span className="text-xs text-white">
          {formatDuration(recordingDuration)}
        </span>
        <button
          onClick={cancelRecording}
          className="text-red-500 hover:text-red-400"
          disabled={uploading}
        >
          <BsTrash size={16} />
        </button>
        <button
          onClick={sendVoiceMessage}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
          disabled={uploading}
        >
          {uploading ? "Sending..." : <BsSend size={14} />}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`transition-colors ${isRecording ? "text-red-500 animate-pulse" : "text-gray-400 hover:text-white"}`}
    >
      {isRecording ? <BsStop size={22} /> : <BsMic size={22} />}
    </button>
  );
}

export default VoiceRecorder;
