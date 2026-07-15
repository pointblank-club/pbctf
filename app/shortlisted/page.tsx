"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DotPattern } from "@/components/registration/dot-pattern";
import { Button } from "@/components/registration/button";
import { Spinner } from "@/components/ui/spinner";
import { motion } from "framer-motion";
import { Users, Trophy, ArrowLeft, Search, Sparkles, Clock } from "lucide-react";
import { SHORTLIST_ANNOUNCE_TIME } from "@/lib/constants";

interface ShortlistedTeam {
  teamCode: string;
  teamName: string;
  memberCount: number;
  leaderName: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.025, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const getTeamInitials = (teamName: string) => {
  const words = teamName.replace(/[^a-zA-Z0-9\s]/g, "").trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

function PendingAnnouncement({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen w-full bg-void relative overflow-x-hidden flex items-center justify-center">
      <DotPattern />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center text-center gap-4 px-6"
      >
        <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-brand/45 bg-brand-soft text-brand font-mono text-[10.5px] uppercase tracking-[0.22em]">
          <Clock className="w-3 h-3" />
          Shortlist · Pending
        </div>
        <h1 className="font-heading text-[32px] sm:text-[44px] font-bold text-ink tracking-tight">
          Will be announced soon<span className="text-brand">.</span>
        </h1>
        <p className="text-[14px] text-ink-secondary font-body max-w-[480px]">
          Check back later to see the teams shortlisted for the PBCTF 5.0 Finals.
        </p>
        <Button onClick={onBack} variant="secondary" size="sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}

function LoadingShortlist() {
  return (
    <div className="min-h-screen w-full bg-void relative overflow-x-hidden flex items-center justify-center">
      <DotPattern />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Loading shortlisted teams…
        </p>
      </div>
    </div>
  );
}

export default function ShortlistedPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnnounced, setIsAnnounced] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shortlistedTeams, setShortlistedTeams] = useState<ShortlistedTeam[]>([]);

  useEffect(() => {
    const announced = Date.now() >= SHORTLIST_ANNOUNCE_TIME.getTime();
    setIsAnnounced(announced);
    if (!announced) {
      setIsLoading(false);
      return;
    }

    const fetchShortlisted = async () => {
      try {
        const response = await fetch("/api/shortlisted-teams");
        const data = await response.json();
        if (data.success && Array.isArray(data.data?.teams)) {
          setShortlistedTeams(data.data.teams);
        }
      } catch (e) {
        console.error("Failed to fetch shortlisted teams:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShortlisted();
  }, []);

  const totalParticipants = shortlistedTeams.reduce((sum, team) => sum + team.memberCount, 0);

  const filteredTeams = shortlistedTeams.filter(
    (team) =>
      team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.teamCode.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!isAnnounced) {
    return <PendingAnnouncement onBack={() => router.push("/dashboard")} />;
  }

  if (isLoading || shortlistedTeams.length === 0) {
    return <LoadingShortlist />;
  }

  return (
    <div className="min-h-screen w-full bg-void relative overflow-x-hidden">
      <DotPattern />

      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Button onClick={() => router.push("/dashboard")} variant="secondary" size="sm">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Button>
        </motion.div>

        {/* Hero */}
        <motion.div
          className="flex flex-col items-center text-center gap-4 mb-12 sm:mb-16"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-brand/45 bg-brand-soft text-brand font-mono text-[10.5px] uppercase tracking-[0.22em]">
            <Trophy className="w-3 h-3" />
            Shortlisted · Finals
          </div>

          <h1 className="font-heading text-balance text-[40px] sm:text-[56px] md:text-[72px] font-bold text-ink leading-[1.02] tracking-tight">
            Congratulations<span className="text-brand">.</span>
          </h1>

          <p className="text-[14px] sm:text-[15.5px] text-ink-secondary font-body leading-relaxed max-w-[680px]">
            We are thrilled to announce the {shortlistedTeams.length} teams shortlisted for the
            PBCTF 5.0 Finals. These teams stood out among hundreds with their skills and grit.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 gap-3 sm:gap-4 mb-10 sm:mb-12 max-w-[640px] mx-auto"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {[
            { Icon: Trophy, value: shortlistedTeams.length, label: "Teams Selected" },
            { Icon: Users, value: totalParticipants, label: "Participants" },
          ].map(({ Icon, value, label }) => (
            <motion.div
              key={label}
              variants={itemVariants}
              className="relative overflow-hidden rounded-lg bg-surface-1 border border-[var(--border-soft)] p-5 sm:p-6 text-center"
            >
              <div className="relative">
                <div className="inline-flex w-10 h-10 items-center justify-center rounded-md bg-brand-soft border border-brand/35 mx-auto mb-3">
                  <Icon className="w-4 h-4 text-brand" />
                </div>
                <p className="font-mono text-[28px] sm:text-[34px] font-bold text-brand tabular-nums leading-none mb-1.5">
                  {value}
                </p>
                <p className="font-mono text-[10.5px] text-ink-muted uppercase tracking-[0.2em]">
                  {label}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          className="max-w-md mx-auto mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="text"
              placeholder="Search teams by name or code…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-md bg-surface-inset border border-[var(--border-soft)] hover:border-[var(--border-default)] focus:border-brand focus:shadow-[0_0_0_3px_var(--brand-soft)] focus:outline-none text-ink text-[14px] font-body placeholder:text-ink-disabled transition-[border-color,box-shadow]"
            />
          </div>
        </motion.div>

        {/* Teams Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredTeams.map((team, index) => {
            const initials = getTeamInitials(team.teamName);
            return (
              <motion.div key={team.teamCode} variants={itemVariants} className="group relative">
                <div className="relative rounded-lg overflow-hidden bg-surface-1 border border-[var(--border-soft)] p-4 transition-[border-color,background] duration-200 hover:border-brand/45 hover:bg-surface-2">
                  <div className="relative flex flex-col gap-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="w-10 h-10 shrink-0 rounded-md inline-flex items-center justify-center font-mono text-[13px] font-bold text-brand-ink bg-brand"
                        style={{ boxShadow: "0 0 16px rgba(0,255,136,0.32)" }}
                      >
                        {initials}
                      </span>
                      <span className="font-mono text-[10.5px] text-ink-subtle uppercase tracking-[0.16em]">
                        #{String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3
                        className="text-[14px] text-ink font-semibold font-body truncate"
                        title={team.teamName}
                      >
                        {team.teamName}
                      </h3>
                      <p
                        className="text-[12px] text-ink-muted font-body truncate mt-0.5"
                        title={team.leaderName}
                      >
                        Led by {team.leaderName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10.5px] text-brand tracking-[0.16em]">
                          {team.teamCode}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10.5px] text-ink-muted">
                          <Users className="w-3 h-3" />
                          {team.memberCount}
                        </span>
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1 font-mono text-[10px] text-brand uppercase tracking-[0.18em]">
                        <Sparkles className="w-3 h-3" />
                        Finalist
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredTeams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-14"
          >
            <p className="text-ink-secondary text-[14px] font-body">
              No teams found matching &ldquo;{searchQuery}&rdquo;
            </p>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          className="mt-14 sm:mt-20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="relative overflow-hidden rounded-lg bg-surface-1 border border-[var(--border-soft)] p-6 sm:p-8 max-w-2xl mx-auto text-center">
            <div className="relative">
              <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand mb-2">
                · End Transmission ·
              </div>
              <h2 className="font-heading text-[24px] sm:text-[30px] font-bold text-ink mb-3 tracking-tight">
                Best of Luck
              </h2>
              <p className="text-[14px] text-ink-secondary font-body mb-6 leading-relaxed">
                To all the shortlisted teams. finish your RSVP before the deadline.
                May the best solution win.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push("/dashboard")} variant="primary">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
