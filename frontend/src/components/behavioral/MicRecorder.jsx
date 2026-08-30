// frontend/src/components/behavioral/MicRecorder.jsx
// Visible waveform/level indicator for speech recording.
// Gated by AI speech — only starts listening after AI finishes or is skipped.

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { useSpeechToText } from '../../hooks/useSpeechToText';

export const MicRecorder = ({ isSpeaking, onTranscriptChange, resetKey, onUnsupported, autoStart = false, language = 'english' }) => {
  const { transcript, interimTranscript, isListening, isSupported, checked, error, start, stop, reset } =
    useSpeechToText(language);
  const [levels, setLevels] = useState([0, 0, 0, 0, 0]);
  const onUnsupportedRef = useRef(onUnsupported);
  const autoStartedRef = useRef(false);

  // Keep ref in sync so the effect below doesn't re-fire on every render.
  useEffect(() => {
    onUnsupportedRef.current = onUnsupported;
  }, [onUnsupported]);

  // Auto-switch to typed fallback when mic/STT is unavailable (only after initial check).
  useEffect(() => {
    if (checked && onUnsupportedRef.current && (!isSupported || error)) {
      onUnsupportedRef.current();
    }
  }, [checked, isSupported, error]);

  // Auto-start recording when component mounts with autoStart=true and conditions are met.
  useEffect(() => {
    if (autoStart && checked && isSupported && !isSpeaking && !error && !autoStartedRef.current) {
      autoStartedRef.current = true;
      reset();
      start();
    }
  }, [autoStart, checked, isSupported, isSpeaking, error, start, reset]);

  // Hard gate: whenever the AI starts speaking (question, follow-up or nudge),
  // stop any in-progress recognition immediately so the AI's voice is never
  // transcribed as the candidate's answer. Centralized in this shared recorder
  // so it applies identically to every voice interview page (Behavioral + Technical).
  useEffect(() => {
    if (isSpeaking && isListening) {
      stop();
    }
  }, [isSpeaking, isListening, stop]);

  // Clear the captured transcript (and stop recording) when the active
  // question/follow-up changes, so stale audio never leaks into the next answer.
  // Also re-arm auto-start so the mic turns back on once the new question's audio ends.
  useEffect(() => {
    if (isListening) stop();
    reset();
    autoStartedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Notify parent of transcript changes
  useEffect(() => {
    if (onTranscriptChange) {
      onTranscriptChange(transcript);
    }
  }, [transcript, onTranscriptChange]);

  // Simulate waveform levels while listening
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setLevels([
          Math.random() * 100,
          Math.random() * 100,
          Math.random() * 100,
          Math.random() * 100,
          Math.random() * 100,
        ]);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setLevels([0, 0, 0, 0, 0]);
    }
  }, [isListening]);

  const handleToggle = () => {
    if (isListening) {
      stop();
    } else {
      reset();
      start();
    }
  };

  // Gate: cannot start if AI is speaking or STT not supported
  const isDisabled = isSpeaking || !isSupported || error;

  return (
    <div className="surface-text bg-surface-hover  rounded-lg p-4">
      <div className="flex items-center gap-4">
        {/* Waveform indicator */}
        <div className="flex items-end gap-1 h-12">
          {levels.map((level, i) => (
            <div
              key={i}
              className={`w-2 rounded-t transition-all duration-150 ${
                isListening ? 'bg-text-primary' : 'bg-icon-muted'
              }`}
              style={{ height: `${Math.max(10, level)}%` }}
            />
          ))}
        </div>

        {/* Mic button */}
        <button
          onClick={handleToggle}
          disabled={isDisabled}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
            isListening
              ? 'bg-danger hover:opacity-90 text-text-primary'
              : isDisabled
              ? 'bg-bg-hover text-text-muted cursor-not-allowed'
              : 'bg-text-primary hover:opacity-90 text-text-primary'
          }`}
          aria-label={isListening ? 'Stop recording' : 'Start recording'}
        >
          {isListening ? (
            <>
              <Square size={18} />
              Stop
            </>
          ) : (
            <>
              <Mic size={18} />
              {error ? 'Mic Unavailable' : 'Start Recording'}
            </>
          )}
        </button>

        {/* Status text */}
        <div className="flex-1 text-sm">
          {error ? (
            <span className="text-danger" role="alert">
              <MicOff size={14} className="inline mr-1" aria-hidden="true" />
              {error === 'not-allowed'
                ? 'Microphone permission denied. You can type your answer instead, or enable mic access in browser settings.'
                : error === 'no-speech'
                ? 'No speech detected. Try speaking louder or check your microphone.'
                : error === 'network'
                ? 'Speech recognition network error. You can type your answer instead.'
                : `Microphone unavailable: ${error}. You can type your answer instead.`}
            </span>
          ) : isSpeaking ? (
            <span className="text-text-muted">Wait for AI to finish speaking...</span>
          ) : isListening ? (
            <span className="text-icon-active">Listening...</span>
          ) : (
            <span className="text-text-muted">Click to start recording</span>
          )}
        </div>
      </div>

      {/* Transcript display */}
      {(transcript || interimTranscript) && (
        <div className="mt-3 p-3 surface-text bg-surface rounded-md">
          <div className="text-sm text-text-muted">
            {transcript}
            {interimTranscript && <span className="text-text-muted italic"> {interimTranscript}</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MicRecorder;
