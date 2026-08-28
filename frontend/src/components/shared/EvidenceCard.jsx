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
    displayScore >= 70 ? 'text-emerald-400' : displayScore >= 40 ? 'text-amber-400' : 'text-rose-400';

  const scoreBgColor =
    displayScore >= 70 ? 'bg-emerald-900/20 border-emerald-700/30' :
    displayScore >= 40 ? 'bg-amber-900/20 border-amber-700/30' :
    'bg-rose-900/20 border-rose-700/30';

  // Generate score explanation based on score range
  const getScoreExplanation = () => {
    if (displayScore >= 80) return isUrdu ? 'بہترین جواب - تمام اہم نکات شامل تھے' : 'Excellent answer - covered all key points effectively';
    if (displayScore >= 60) return isUrdu ? 'اچھا جواب - کچھ مزید تفصیل شامل کی جا سکتی ہے' : 'Good answer - could include more specific details or examples';
    if (displayScore >= 40) return isUrdu ? 'منصفانہ جواب - اہم نکات غائب ہیں' : 'Fair answer - missing some key points or specific examples';
    if (displayScore > 0) return isUrdu ? 'جواب میں مزید تفصیل اور مثالوں کی ضرورت ہے' : 'Answer needs more detail, specific examples, and structure';
    return isUrdu ? 'کوئی درست جواب نہیں دیا گیا' : 'No valid answer was provided for this question';
  };

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="pb-3">
        {/* Score header with visual indicator */}
        <div className={`rounded-lg p-3 border ${scoreBgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${scoreColor}`}>{displayScore}</div>
              <div className="text-slate-400 text-sm">/100</div>
            </div>
            <Badge variant={confidenceVariant} size="sm">
              {displayConfidence} confidence
            </Badge>
          </div>
          {/* Score explanation */}
          <div className="mt-2 text-sm text-slate-300">
            {getScoreExplanation()}
          </div>
        </div>

        {/* Dimension scores breakdown */}
        {dimensions && Object.keys(dimensions).length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              {isUrdu ? 'تفصیلی اسکور' : 'Score Breakdown'}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(dimensions).map(([key, value]) => {
                const dimScore = typeof value === 'number' ? value : 0;
                const dimColor = dimScore >= 7 ? 'text-emerald-400' : dimScore >= 4 ? 'text-amber-400' : 'text-rose-400';
                const barWidth = Math.min(100, dimScore * 10);
                return (
                  <div key={key} className="bg-slate-800/50 rounded-md px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400 capitalize">{key}</span>
                      <span className={`text-sm font-semibold ${dimColor}`}>{dimScore}/10</span>
                    </div>
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dimScore >= 7 ? 'bg-emerald-500' : dimScore >= 4 ? 'bg-amber-500' : 'bg-rose-500'}`}
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
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Quote size={14} className="text-indigo-400" />
              {isUrdu ? 'شواہد' : 'What you said'}
            </div>
            <ul className="space-y-1.5 pl-5">
              {evidence.map((item, i) => (
                <li key={i} className={`text-sm text-slate-400 list-disc ${textClass}`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Strength */}
        {strength && (
          <div className="flex items-start gap-3 p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
            <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-emerald-400 mb-1 uppercase tracking-wide">
                {isUrdu ? 'طاقت' : 'Strength'}
              </div>
              <div className={`text-sm text-slate-200 ${textClass}`}>{strength}</div>
            </div>
          </div>
        )}

        {/* Gap / Missing */}
        {missing && (
          <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
            <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide">
                {isUrdu ? 'خلا' : 'What was missing'}
              </div>
              <div className={`text-sm text-slate-200 ${textClass}`}>{missing}</div>
            </div>
          </div>
        )}

        {/* Improvement */}
        {improvement && (
          <div className="flex items-start gap-3 p-3 bg-indigo-900/20 border border-indigo-700/30 rounded-lg">
            <Lightbulb size={18} className="text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wide">
                {isUrdu ? 'بہتری کا طریقہ' : 'How to improve'}
              </div>
              <div className={`text-sm text-slate-200 ${textClass}`}>{improvement}</div>
            </div>
          </div>
        )}

        {/* No feedback available message */}
        {!strength && !missing && !improvement && (!evidence || evidence.length === 0) && (
          <div className="text-center py-4 text-slate-500 text-sm">
            {isUrdu ? 'تفصیلی فیڈبیک دستیاب نہیں ہے' : 'Detailed feedback not available for this answer'}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
EvidenceCard.displayName = 'EvidenceCard';

export default EvidenceCard;
