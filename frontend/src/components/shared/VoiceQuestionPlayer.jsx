// frontend/src/components/shared/VoiceQuestionPlayer.jsx
// Shared component for speaking questions/follow-ups aloud.
// Reused by Behavioral (Day 2), Technical (Day 3), and Coding (Day 5).
// Speaks text via TTS, shows caption, exposes skip control.

import React, { useEffect } from 'react';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { Volume2, SkipForward } from 'lucide-react';
import { Button } from '../../design-system/Button';

export const VoiceQuestionPlayer = ({ text, onSpeakingChange }) => {
  const { speak, cancel, isSpeaking, isSupported } = useTextToSpeech();

  // Auto-speak when text changes
  useEffect(() => {
    if (text && isSupported) {
      speak(text);
    }
    return () => {
      cancel();
    };
  }, [text, isSupported, speak, cancel]);

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
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${isSpeaking ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`}>
          <Volume2 size={20} />
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-300 mb-2">
            {isSpeaking ? (
              <span className="text-indigo-400 font-medium">AI is speaking...</span>
            ) : (
              <span className="text-slate-400">Question:</span>
            )}
          </div>
          <div className="text-slate-100 leading-relaxed">{text}</div>
        </div>
        {isSpeaking && isSupported && (
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
