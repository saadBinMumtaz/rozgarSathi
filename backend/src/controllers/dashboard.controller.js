export const getDashboardData = async (req, res, next) => {
  try {
    const { userId } = req.params;
    return res.json({
      overallReadiness: 78,
      perMode: {
        behavioral: 82,
        technical: 75,
        coding: 76,
      },
      weakestCompetency: 'System Architecture & Scalability',
      trend: [
        { sessionDate: '2026-08-20', score: 70 },
        { sessionDate: '2026-08-22', score: 74 },
        { sessionDate: '2026-08-24', score: 78 },
      ],
      crossModeInsight:
        'Demonstrates strong fundamental knowledge across modes, but performance drops under timed architectural trade-off questions.',
      weights: {
        coding: 0.4,
        technical: 0.35,
        behavioral: 0.25,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default { getDashboardData };
