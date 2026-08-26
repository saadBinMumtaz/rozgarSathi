// frontend/src/components/shared/EvidenceCard.jsx
// Reusable evaluation display: Score -> Evidence -> Strength -> Gap -> Fix.
// Used by Behavioral (Day 2), Technical (Day 3), and Coding (Day 5).
// Supports language-aware display with Urdu RTL text when language='urdu'.

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system/Card';
import { Badge } from '../../design-system/Badge';
import { CheckCircle, AlertCircle, Lightbulb, Quote } from 'lucide-react';

export const EvidenceCard = ({ evaluation, language = 'english' }) => {
  if (!evaluation) return null;

  const { score, dimensions, evidence, strength, missing, improvement, confidenceLevel } = evaluation;
  const isUrdu = language === 'urdu';
  const textClass = isUrdu ? 'urdu-text' : '';

  const confidenceVariant =
    confidenceLevel === 'high' ? 'success' : confidenceLevel === 'medium' ? 'warning' : 'destructive';

  const scoreColor =
    score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400';

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className={scoreColor}>Score: {score}/100</span>
            <Badge variant={confidenceVariant} size="sm">
              {confidenceLevel} confidence
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimension scores */}
        {dimensions && Object.keys(dimensions).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(dimensions).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-slate-800/50 rounded-md px-3 py-1.5">
                <span className="text-xs text-slate-400 capitalize">{key}</span>
                <span className="text-sm font-medium text-slate-200">{value}/10</span>
              </div>
            ))}
          </div>
        )}

        {/* Evidence */}
        {evidence && evidence.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Quote size={14} className="text-indigo-400" />
              {isUrdu ? 'شواہد' : 'Evidence'}
            </div>
            <ul className="space-y-1 pl-5">
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
          <div className="flex items-start gap-2">
            <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-medium text-emerald-400 mb-0.5">
                {isUrdu ? 'طاقت' : 'Strength'}
              </div>
              <div className={`text-sm text-slate-300 ${textClass}`}>{strength}</div>
            </div>
          </div>
        )}

        {/* Gap / Missing */}
        {missing && (
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-medium text-amber-400 mb-0.5">
                {isUrdu ? 'خلا' : 'Gap'}
              </div>
              <div className={`text-sm text-slate-300 ${textClass}`}>{missing}</div>
            </div>
          </div>
        )}

        {/* Improvement */}
        {improvement && (
          <div className="flex items-start gap-2">
            <Lightbulb size={16} className="text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-medium text-indigo-400 mb-0.5">
                {isUrdu ? 'بہتری کا طریقہ' : 'How to improve'}
              </div>
              <div className={`text-sm text-slate-300 ${textClass}`}>{improvement}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EvidenceCard;
