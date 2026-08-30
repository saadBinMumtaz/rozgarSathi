// frontend/src/components/shared/VoiceQuestionPlayer.jsx
// Shared component for speaking questions/follow-ups aloud.
// Reused by Behavioral (Day 2), Technical (Day 3), and Coding (Day 5).
// Speaks text via TTS, shows caption, exposes skip control.
// Supports language-aware TTS with Urdu voice fallback notice.

import React, { useEffect } from 'react';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { Volume2, SkipForward, RefreshCw } from 'lucide-react';
import { Button } from '../../design-system/Button';

export const VoiceQuestionPlayer = ({ text, fallbackText, onSpeakingChange, language = 'english' }) => {
  const { speak, cancel, isSpeaking, isSupported, urduLoading, urduVoiceUnavailable } = useTextToSpeech();

  // Auto-speak when text changes
  useEffect(() => {
    if (text && isSupported) {
      speak(text, language, fallbackText);
    }
    return () => {
      cancel();
    };
  }, [text, isSupported, speak, cancel, language, fallbackText]);

  // Notify parent of speaking state changes
  useEffect(() => {
    if (onSpeakingChange) {
      onSpeakingChange(isSpeaking);
    }
  }, [isSpeaking, onSpeakingChange]);

  const handleSkip = () => {
    cancel();
  };

  if (!text) return null;

  return (
    <div className="surface-text bg-surface  rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${isSpeaking ? 'text-icon-active animate-pulse' : 'text-icon-muted'}`}>
          <Volume2 size={20} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-text-muted mb-2">
            {!isSupported ? (
              <span className="text-warning font-medium flex items-center gap-1" role="status">
                Text-only mode — read the question below
              </span>
            ) : urduLoading ? (
              <span className="text-text-muted font-medium animate-pulse">Loading Urdu voice...</span>
            ) : isSpeaking ? (
              <span className="text-icon-active font-medium">AI is speaking...</span>
            ) : (
              <span className="text-text-muted">Question:</span>
            )}
          </div>
          <div className={`text-text-primary leading-relaxed ${language === 'urdu' ? 'urdu-text' : ''}`}>{text}</div>

          {/* Only shown when BOTH local Urdu voice and cloud Urdu TTS fail — degrades to English */}
          {urduVoiceUnavailable && language === 'urdu' && (
            <div className="mt-2 text-xs text-warning bg-warning/10  rounded px-2 py-1">
              Urdu voice unavailable — playing audio in English.
            </div>
          )}

          {/* Repeat: re-trigger TTS of the currently shown text at any time (question,
              nudge or follow-up), respecting the active language. Reuses the same speak(). */}
          {isSupported && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak(text, language, fallbackText)}
                className="flex items-center gap-1 text-text-muted"
                aria-label="Repeat question"
              >
                <RefreshCw size={15} />
                Repeat Question
              </Button>
            </div>
          )}
        </div>
        {(isSpeaking || urduLoading) && isSupported && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSkip}
            className="flex items-center gap-1"
          >
            <SkipForward size={16} />
            Skip
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceQuestionPlayer;
