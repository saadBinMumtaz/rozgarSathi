// frontend/src/components/shared/StreakBadge.jsx
// Displays a consistency streak badge on the Dashboard.
// Fetches streak data derived from Session.createdAt aggregation in MongoDB.
// Uses design-system Badge — no mock/hardcoded data.

import React, { useState, useEffect } from 'react';
import { Badge } from '../../design-system/Badge';
import { apiClient } from '../../api/client';
import { Flame } from 'lucide-react';

export const StreakBadge = ({ userId }) => {
  const [streak, setStreak] = useState(null);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchStreak = async () => {
      try {
        const result = await apiClient.getStreak(userId);
        if (!cancelled) {
          setStreak(result.streak ?? 0);
          setTotalDays(result.totalDays ?? 0);
        }
      } catch {
        if (!cancelled) setStreak(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStreak();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) return null;

  // No streak yet
  if (!streak || streak === 0) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Flame size={12} />
        Start your streak!
      </Badge>
    );
  }

  // Determine variant based on streak length
  const variant = streak >= 7 ? 'success' : streak >= 3 ? 'warning' : 'secondary';

  return (
    <Badge variant={variant} className="gap-1" title={`${streak}-day streak across ${totalDays} active days`}>
      <Flame size={12} className={streak >= 3 ? 'text-warning' : ''} />
      {streak}-day streak
    </Badge>
  );
};

export default StreakBadge;
