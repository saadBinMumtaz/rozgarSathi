// frontend/src/components/shared/EvidenceCard.jsx
// Reusable evaluation display: Score -> Evidence -> Strength -> Gap -> Fix.
// Used by Behavioral (Day 2), Technical (Day 3), and Coding (Day 5).
// Supports language-aware display with Urdu RTL text when language='urdu'.

import React, { memo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { CheckCircle, AlertCircle, Lightbulb, Quote, TrendingUp, Target } from 'lucide-react';

export const EvidenceCard = memo(({ evaluation, language = 'english' }) => {
  if (!evaluation) return null;

  const { score, dimensions, evidence, strength, missing, improvement, confidenceLevel } = evaluation;
  const isUrdu = language === 'urdu';
  const textClass = isUrdu ? 'urdu-text' : '';

  // Handle missing/undefined values gracefully
  const displayScore = typeof score === 'number' ? score : 0;
  const displayConfidence = confidenceLevel || 'medium';

  const confidenceVariant =
    displayConfidence === 'high' ? 'success' : displayConfidence === 'medium' ? 'warning' : 'destructive';

  const scoreColor =
    displayScore >= 70 ? 'text-success' : displayScore >= 40 ? 'text-warning' : 'text-danger';

  const scoreBgColor =
    displayScore >= 70 ? 'bg-success/10 border-success/30' :
    displayScore >= 40 ? 'bg-warning/10 border-warning/30' :
    'bg-danger/10 border-danger/30';

  // Use actual evaluation strength as the primary explanation — avoids formulaic templates
  const getScoreExplanation = () => {
    // Prefer the actual AI-generated strength as the score explanation
    if (strength) return strength;
    // Fallback: specific score-range descriptions when strength is unavailable
    if (displayScore >= 80) return isUrdu
      ? 'اسکور سے ظاہر ہوتا ہے کہ جواب میں زیادہ تر اہم نکات مخصوص مثالوں کے ساتھ شامل تھے'
      : 'Score indicates strong performance — likely covered most key points with specific examples and clear structure';
    if (displayScore >= 60) return isUrdu
      ? 'اسکور سے ظاہر ہوتا ہے کہ بنیادی سمجھ موجود ہے لیکن گہرائی یا مخصوص تفصیلات کی کمی ہے'
      : 'Score indicates solid foundational understanding but missing depth or specific supporting details in key areas';
    if (displayScore >= 40) return isUrdu
      ? 'اسکور سے ظاہر ہوتا ہے کہ جواب نامکمل تھا — کئی اہم نکات یا مخصوص مثالیں غائب تھیں'
      : 'Score indicates the answer was incomplete — several important points or specific examples were absent';
    if (displayScore > 0) return isUrdu
      ? 'اسکور سے ظاہر ہوتا ہے کہ جواب بہت مختصر یا مبہم تھا — مزید مخصوص تفصیلات اور مثالوں کی ضرورت ہے'
      : 'Score indicates the answer was too brief or vague — significantly more specific detail and concrete examples are needed';
    return isUrdu
      ? 'اس سوال کے لیے کوئی قابلِ تشخیص جواب نہیں دیا گیا'
      : 'No evaluable answer was provided for this question';
  };

  return (
    <Card className="border-border-theme surface-text bg-surface">
      <CardHeader className="pb-3">
        {/* Score header with visual indicator */}
        <div className={`rounded-lg p-3 border ${scoreBgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${scoreColor}`} aria-label={`Score: ${displayScore} out of 100`}>{displayScore}</div>
              <div className="text-text-muted text-sm">/100</div>
            </div>
            <Badge variant={confidenceVariant} size="sm">
              {displayConfidence} confidence
            </Badge>
          </div>
          {/* Score explanation */}
          <div className="mt-2 text-sm text-text-muted">
            {getScoreExplanation()}
          </div>
        </div>

        {/* Dimension scores breakdown */}
        {dimensions && Object.keys(dimensions).length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
              {isUrdu ? 'تفصیلی اسکور' : 'Score Breakdown'}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(dimensions).map(([key, value]) => {
                const dimScore = typeof value === 'number' ? value : 0;
                const dimColor = dimScore >= 7 ? 'text-success' : dimScore >= 4 ? 'text-warning' : 'text-danger';
                const barWidth = Math.min(100, dimScore * 10);
                return (
                  <div key={key} className="surface-text bg-surface-hover rounded-md px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-muted capitalize">{key}</span>
                      <span className={`text-sm font-semibold ${dimColor}`} aria-label={`${key}: ${dimScore} out of 10`}>{dimScore}/10</span>
                    </div>
                    <div className="h-1 bg-border-theme/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dimScore >= 7 ? 'bg-success' : dimScore >= 4 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Evidence */}
        {evidence && evidence.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Quote size={14} className="text-icon-muted" />
              {isUrdu ? 'شواہد' : 'What you said'}
            </div>
            <ul className="space-y-1.5 pl-5">
              {evidence.map((item, i) => (
                <li key={i} className={`text-sm text-text-muted list-disc ${textClass}`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strength */}
        {strength && (
          <div className="flex items-start gap-3 p-3 bg-success/10  rounded-lg">
            <CheckCircle size={18} className="text-success mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-success mb-1 uppercase tracking-wide">
                {isUrdu ? 'طاقت' : 'Strength'}
              </div>
              <div className={`text-sm text-text-primary ${textClass}`}>{strength}</div>
            </div>
          </div>
        )}

        {/* Gap / Missing */}
        {missing && (
          <div className="flex items-start gap-3 p-3 bg-warning/10  rounded-lg">
            <AlertCircle size={18} className="text-warning mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-warning mb-1 uppercase tracking-wide">
                {isUrdu ? 'خلا' : 'What was missing'}
              </div>
              <div className={`text-sm text-text-primary ${textClass}`}>{missing}</div>
            </div>
          </div>
        )}

        {/* Improvement */}
        {improvement && (
          <div className="flex items-start gap-3 p-3 surface-text bg-surface-hover  rounded-lg">
            <Lightbulb size={18} className="text-icon-active mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-text-primary mb-1 uppercase tracking-wide">
                {isUrdu ? 'بہتری کا طریقہ' : 'How to improve'}
              </div>
              <div className={`text-sm text-text-primary ${textClass}`}>{improvement}</div>
            </div>
          </div>
        )}

        {/* No feedback available message */}
        {!strength && !missing && !improvement && (!evidence || evidence.length === 0) && (
          <div className="text-center py-4 text-text-muted text-sm">
            {isUrdu ? 'تفصیلی فیڈبیک دستیاب نہیں ہے' : 'Detailed feedback not available for this answer'}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
EvidenceCard.displayName = 'EvidenceCard';

export default EvidenceCard;
