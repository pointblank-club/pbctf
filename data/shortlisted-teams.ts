// Shortlisted teams data for Zenith Hackathon Finals

export interface ShortlistedTeam {
  teamCode: string;
  teamName: string;
  memberCount: number;
  leaderName: string;
}

export const shortlistedTeams: ShortlistedTeam[] = [];

// Calculate total participants
export const totalParticipants = shortlistedTeams.reduce(
  (sum, team) => sum + team.memberCount,
  0,
);
