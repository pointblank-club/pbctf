// Shortlisted teams data for Zenith Hackathon Finals

export interface ShortlistedTeam {
  teamCode: string;
  teamName: string;
  memberCount: number;
  leaderName: string;
}

export const shortlistedTeams: ShortlistedTeam[] = [
  { teamCode: "FAKXJNU", teamName: "--rebase", memberCount: 4, leaderName: "Yogita Babu Naik" },
  { teamCode: "V5LVEC", teamName: "AlgoRhythm", memberCount: 4, leaderName: "K Kushal Sai" },
  { teamCode: "IX2G2XC", teamName: "ALPHAGO", memberCount: 3, leaderName: "Durva Sharma" },
  { teamCode: "6WJKZX9", teamName: "ARCH LINUX", memberCount: 4, leaderName: "AdityaRajB" },
  { teamCode: "G6BMZPE", teamName: "BlankPoint", memberCount: 3, leaderName: "Kushal B Gowda" },
  { teamCode: "IQJL0KB", teamName: "BLUEJAYS", memberCount: 2, leaderName: "Umaima Tanveer" },
  { teamCode: "HKVEPOB", teamName: "Broke No More", memberCount: 4, leaderName: "Ashitha" },
  { teamCode: "JBR45QK", teamName: "Catalyst", memberCount: 3, leaderName: "Arnav Dandawate" },
  { teamCode: "T2IYQBM", teamName: "CodeHashiras", memberCount: 4, leaderName: "Ankit Choubey" },
  { teamCode: "4WMPCDP", teamName: "Context Window", memberCount: 4, leaderName: "Himanshu Rai" },
  { teamCode: "SY8NC6N", teamName: "DRS", memberCount: 4, leaderName: "Rudranil Bhattacharya" },
  { teamCode: "MK7G9W3", teamName: "Final Commit", memberCount: 4, leaderName: "Sreejith s" },
  { teamCode: "PQ2R8XL", teamName: "H.A.S.H", memberCount: 4, leaderName: "Abhinav" },
  { teamCode: "NV6Y1WZ", teamName: "HackSquad", memberCount: 4, leaderName: "Sekh Gulam Mainuddin" },
  { teamCode: "RLTP5H4", teamName: "HireGo", memberCount: 4, leaderName: "Aditya Singh Rawat" },
  { teamCode: "BF9KM2J", teamName: "HungryDev", memberCount: 1, leaderName: "Akash Pattnaik" },
  { teamCode: "WX3Z7CV", teamName: "Hustlers", memberCount: 1, leaderName: "Rohit Arora" },
  { teamCode: "H8JN4PL", teamName: "Krafters", memberCount: 1, leaderName: "Shoyeb Ansari" },
  { teamCode: "Y1QS6DK", teamName: "L4T3NT", memberCount: 4, leaderName: "Dewansh Shukla" },
  { teamCode: "A5TF0MC", teamName: "LockedIn", memberCount: 4, leaderName: "Adil Zainul Syed" },
  { teamCode: "E2UV8GA", teamName: "Logic loopers", memberCount: 4, leaderName: "Prajwal Gaonkar" },
  { teamCode: "K9XW3BP", teamName: "NP-Hard Feelings", memberCount: 3, leaderName: "Urvi Umesh" },
  { teamCode: "C4ZR7NJ", teamName: "Phantom-Stroke", memberCount: 4, leaderName: "Rahul Raikar" },
  { teamCode: "D7EI2LS", teamName: "SignalStack", memberCount: 4, leaderName: "Chinmai S D" },
  { teamCode: "F6HK1OT", teamName: "STATIC", memberCount: 3, leaderName: "Sriram Kulkarni" },
  { teamCode: "L3MQ9VU", teamName: "TabbyCat", memberCount: 2, leaderName: "Avinash A" },
  { teamCode: "O0RY4WX", teamName: "try.except", memberCount: 4, leaderName: "Dashank Doshi" },
  { teamCode: "U8SA5ZC", teamName: "Turing Machine", memberCount: 4, leaderName: "Harsh Dubey" },
  { teamCode: "Q1TB6DG", teamName: "welcome to south george", memberCount: 3, leaderName: "Arnav Sonavane" },
  { teamCode: "S4UC7EH", teamName: "ZENTRA", memberCount: 4, leaderName: "Mohammed Ridhwan" },
  { teamCode: "V7WD8FI", teamName: "Zenxshi", memberCount: 4, leaderName: "Vraj vashi" },
  { teamCode: "X0YE9GJ", teamName: "Zero Trifecta", memberCount: 3, leaderName: "Varghese K James" },
];

// Calculate total participants
export const totalParticipants = shortlistedTeams.reduce(
  (sum, team) => sum + team.memberCount,
  0
);
