"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Recording, Selection } from "@/types/recording";

interface RecordingContextType {
  recording: Recording | null;
  setRecording: (recording: Recording | null) => void;
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(
  undefined
);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  return (
    <RecordingContext.Provider
      value={{ recording, setRecording, selection, setSelection }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error("useRecording must be used within a RecordingProvider");
  }
  return context;
}
