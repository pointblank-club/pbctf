'use client';

import { useState } from 'react';
import { useRouter } from "next/navigation";
import { DotPattern } from "@/components/registration/dot-pattern";
import { Button } from "@/components/registration/button";
import { motion } from "framer-motion";
import { Users, Trophy, ArrowLeft, Search, Sparkles } from "lucide-react";
import { shortlistedTeams, totalParticipants } from "@/data/shortlisted-teams";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const
    }
  }
};

const heroVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const
    }
  }
};

const statVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  }
};

// Theme accent color (green)
const accentColor = {
  bg: 'rgba(34,197,94, 0.15)',
  border: 'rgba(34,197,94, 0.4)',
  glow: 'rgba(34,197,94, 0.3)'
};

// Generate initials from team name
const getTeamInitials = (teamName: string) => {
  const words = teamName.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

export default function ShortlistedPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter teams based on search query
  const filteredTeams = shortlistedTeams.filter(team =>
    team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.teamCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center relative overflow-x-hidden"
      style={{
        backgroundImage: "linear-gradient(90deg, rgb(10,10,10) 0%, rgb(10,10,10) 100%)",
      }}
    >
      {/* Background gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg viewBox=\"0 0 1440 652\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"none\"><rect x=\"0\" y=\"0\" height=\"100%\" width=\"100%\" fill=\"url(%23grad)\" opacity=\"1\"/><defs><radialGradient id=\"grad\" gradientUnits=\"userSpaceOnUse\" cx=\"0\" cy=\"0\" r=\"10\" gradientTransform=\"matrix(31.68 0 0 22.168 0 174.74)\"><stop stop-color=\"rgba(62,32,19,1)\" offset=\"0.10445\"/><stop stop-color=\"rgba(62,32,19,0)\" offset=\"1\"/></radialGradient></defs></svg>')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      />

      {/* Dot pattern */}
      <DotPattern />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12 lg:py-16">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button onClick={() => router.push("/dashboard")} variant="secondary">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          className="flex flex-col gap-4 sm:gap-6 items-center text-center mb-12 sm:mb-16"
          variants={heroVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <div className="backdrop-blur-[2.5px] backdrop-filter bg-[rgba(255,255,255,0)] flex items-center justify-center px-4 py-2 rounded-[15px] shadow-[0px_3px_10px_0px_rgba(22,163,74,0.5)] relative">
            <Trophy className="w-4 h-4 text-[#22c55e] mr-2" />
            <p className="text-[14px] text-white leading-[16.8px]" style={{ fontFamily: 'var(--font-body)' }}>
              Shortlisted Teams
            </p>
            <div className="absolute inset-0 rounded-[15px]">
              <div className="absolute border border-[#b85c00] border-solid inset-0 pointer-events-none rounded-[15px]" />
            </div>
          </div>

          {/* Title */}
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-tight tracking-[-1px] drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Congratulations!
          </h1>

          {/* Subtitle */}
          <p 
            className="text-base sm:text-lg text-white opacity-90 leading-relaxed max-w-[700px] px-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            We are thrilled to announce the 32 teams that have been shortlisted for the PBCTF 5.0 Finals.
            These exceptional teams stood out among hundreds of registrations with their skills and determination.
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="grid grid-cols-2 gap-4 sm:gap-6 mb-12 sm:mb-16 max-w-3xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div
            variants={statVariants}
            className="backdrop-blur-[2.5px] backdrop-filter bg-[rgba(138,138,138,0.1)] rounded-[16px] p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] text-center"
          >
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[rgba(34,197,94,0.2)] border border-[#22c55e] mx-auto mb-3">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#22c55e]" />
            </div>
            <p className="text-3xl sm:text-4xl text-white font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              {shortlistedTeams.length}
            </p>
            <p className="text-sm text-white opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
              Teams Selected
            </p>
          </motion.div>

          <motion.div
            variants={statVariants}
            className="backdrop-blur-[2.5px] backdrop-filter bg-[rgba(138,138,138,0.1)] rounded-[16px] p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] text-center"
          >
            <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[rgba(34,197,94,0.2)] border border-[#22c55e] mx-auto mb-3">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#22c55e]" />
            </div>
            <p className="text-3xl sm:text-4xl text-white font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              {totalParticipants}
            </p>
            <p className="text-sm text-white opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
              Participants
            </p>
          </motion.div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          className="max-w-md mx-auto mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative bg-[rgba(138,138,138,0.15)] border border-[rgba(255,255,255,0.2)] rounded-[15px] overflow-hidden">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <Search className="w-5 h-5 text-white/50" />
            </div>
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 transition-all"
              style={{ fontFamily: 'var(--font-body)' }}
            />
          </div>
        </motion.div>

        {/* Teams Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredTeams.map((team, index) => {
            const initials = getTeamInitials(team.teamName);
            
            return (
              <motion.div
                key={team.teamCode}
                variants={itemVariants}
                whileHover={{ 
                  y: -8,
                  transition: { duration: 0.2 }
                }}
                className="group relative"
              >
                {/* Card */}
                <div 
                  className="relative overflow-hidden rounded-[20px] p-[1px] transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor.border}, transparent 50%, ${accentColor.border})`,
                  }}
                >
                  {/* Inner card */}
                  <div className="relative bg-[#1a1a1a] rounded-[19px] p-5 h-full overflow-hidden">
                    {/* Glow effect on hover */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at 50% 0%, ${accentColor.glow}, transparent 70%)`,
                      }}
                    />
                    
                    {/* Rank number */}
                    <div className="absolute top-3 right-3 text-[10px] text-white/20 font-mono">
                      #{String(index + 1).padStart(2, '0')}
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col gap-4">
                      {/* Avatar/Initials */}
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shrink-0 transition-transform duration-300 group-hover:scale-110"
                          style={{ 
                            background: `linear-gradient(135deg, ${accentColor.bg}, ${accentColor.border})`,
                            boxShadow: `0 4px 20px ${accentColor.glow}`
                          }}
                        >
                          {initials}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Team Name */}
                          <h3 
                            className="text-white font-semibold text-base leading-tight truncate group-hover:text-white/90 transition-colors"
                            style={{ fontFamily: 'var(--font-body)' }}
                            title={team.teamName}
                          >
                            {team.teamName}
                          </h3>
                          
                          {/* Leader Name */}
                          <p 
                            className="text-xs text-white/50 mt-0.5 truncate"
                            style={{ fontFamily: 'var(--font-body)' }}
                            title={team.leaderName}
                          >
                            Led by {team.leaderName}
                          </p>
                        </div>
                      </div>

                      {/* Bottom row */}
                      <div className="flex items-center justify-between">
                        {/* Team Code & Member count */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/40 font-mono">
                            {team.teamCode}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-white/40" />
                            <span className="text-xs text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
                              {team.memberCount}
                            </span>
                          </div>
                        </div>
                        
                        {/* Sparkle indicator */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Sparkles className="w-3.5 h-3.5 text-[#22c55e]" />
                          <span className="text-[10px] text-[#22c55e] uppercase tracking-wider font-medium">
                            Finalist
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Decorative corner accent */}
                    <div 
                      className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300"
                      style={{ background: accentColor.border }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* No results message */}
        {filteredTeams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-white opacity-70 text-lg" style={{ fontFamily: 'var(--font-body)' }}>
              No teams found matching &quot;{searchQuery}&quot;
            </p>
          </motion.div>
        )}

        {/* Footer Section */}
        <motion.div
          className="mt-16 sm:mt-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="backdrop-blur-[2.5px] backdrop-filter bg-[rgba(138,138,138,0.1)] rounded-[20px] p-6 sm:p-8 border border-[rgba(255,255,255,0.15)] max-w-2xl mx-auto">
            <h2 
              className="text-2xl sm:text-3xl text-white mb-4"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Best of Luck!
            </h2>
            <p 
              className="text-white opacity-80 mb-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              To all the shortlisted teams, we wish you the very best for the finals. Don't forget to finish your RSVP before the deadline.
              May the best solution win!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push("/dashboard")} variant="primary">
                Go to Dashboard
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
