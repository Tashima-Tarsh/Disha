"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface JarvisContextType {
  isSpeaking: boolean;
  isListening: boolean;
  speak: (text: string) => void;
  listen: () => void;
  stopListening: () => void;
  status: string;
}

const JarvisContext = createContext<JarvisContextType | undefined>(undefined);

export const JarvisProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("Standby");
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Initialize voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      // Try to find a premium British male voice (Jarvis style)
      const preferred = availableVoices.find(v => 
        (v.name.includes("Google UK English Male") || v.name.includes("Arthur") || v.name.includes("Daniel")) && 
        v.lang.startsWith("en-GB")
      ) || availableVoices.find(v => v.lang.startsWith("en")) || availableVoices[0];
      
      setVoice(preferred);
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    
    // Stop any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.pitch = 0.9; // Slightly deeper
    utterance.rate = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatus("Speaking");
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus("Standby");
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatus("Error");
    };

    window.speechSynthesis.speak(utterance);
  }, [voice]);

  const listen = useCallback(() => {
    // Basic STT check
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("Listening...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log("Jarvis heard:", transcript);
      // Trigger event or callback for intelligence engine here
      setStatus(`Last heard: "${transcript}"`);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status === "Listening...") setStatus("Standby");
    };

    recognition.onerror = (event: any) => {
      console.error("STT Error:", event.error);
      setIsListening(false);
      setStatus(`STT Error: ${event.error}`);
    };

    recognition.start();
  }, [status]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setStatus("Standby");
  }, []);

  return (
    <JarvisContext.Provider value={{ isSpeaking, isListening, speak, listen, stopListening, status }}>
      {children}
    </JarvisContext.Provider>
  );
};

export const useJarvis = () => {
  const context = useContext(JarvisContext);
  if (!context) throw new Error("useJarvis must be used within a JarvisProvider");
  return context;
};
