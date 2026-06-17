"use client";

import { Calendar, Users, FileText, Award, Gift, HelpCircle, Target, LogIn, UserPlus } from "lucide-react";
import { FormSection } from "./form-section";
import { Button } from "./button";
import { Card } from "./card";

interface LandingContainerProps {
  onNavigate: (view: string) => void;
}

interface ProblemStatement {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  active: boolean;
}

// Mock problem statements - will be replaced with API call
const problemStatements: ProblemStatement[] = [
  { id: '1', title: 'AI-Powered Healthcare Assistant', description: 'Build an AI solution for healthcare diagnostics', category: 'AI/ML', difficulty: 'Advanced', active: true },
  { id: '2', title: 'Sustainable Smart City Platform', description: 'Create a platform for managing smart city infrastructure', category: 'IoT', difficulty: 'Intermediate', active: true },
  { id: '3', title: 'Financial Inclusion App', description: 'Develop a mobile app for underbanked populations', category: 'FinTech', difficulty: 'Beginner', active: true },
  { id: '4', title: 'Blockchain Supply Chain', description: 'Build a transparent supply chain solution using blockchain', category: 'Blockchain', difficulty: 'Advanced', active: true },
];

export function LandingContainer({ onNavigate }: LandingContainerProps) {
  return (
    <div className="flex flex-col gap-[48px] max-w-[900px] w-full">
      {/* Hero Section */}
      <div className="flex flex-col gap-[16px] items-center text-center">
        <div className="backdrop-blur-[2.5px] backdrop-filter bg-[rgba(255,255,255,0)] flex items-center justify-center px-[12px] py-[7px] rounded-[15px] shadow-[0px_3px_10px_0px_rgba(22,163,74,0.5)] relative">
          <p className="font-['Google_Sans_Flex',sans-serif] text-[14px] text-white leading-[16.8px]">Registration Open</p>
          <div className="absolute inset-0 rounded-[15px]">
            <div className="absolute border border-[#b85c00] border-solid inset-0 pointer-events-none rounded-[15px]" />
          </div>
        </div>
        
        <h1 className="font-['Google_Sans_Flex',sans-serif] text-[56px] text-white leading-[60px] tracking-[-1px]">
          Welcome to PBCTF 5.0
        </h1>

        <p className="font-['Google_Sans_Flex',sans-serif] text-[17px] text-white opacity-90 leading-[26px] max-w-[700px]">
          Join us for an intense Capture the Flag competition. Solve security challenges and capture flags, collaborate with talented hackers, and compete for amazing prizes.
        </p>

        <div className="flex gap-[12px] mt-[16px]">
          <Button onClick={() => onNavigate('register')} variant="primary">
            <UserPlus className="w-4 h-4" />
            Register Now
          </Button>
          <Button onClick={() => onNavigate('login')} variant="secondary">
            <LogIn className="w-4 h-4" />
            Login
          </Button>
          <Button onClick={() => onNavigate('problem-statements')} variant="secondary">
            <Target className="w-4 h-4" />
            View Challenges
          </Button>
        </div>
      </div>

      {/* Problem Statements Preview */}
      <FormSection title="Featured Challenges">
        <div className="grid grid-cols-2 gap-[16px]">
          {problemStatements.slice(0, 4).map((ps) => (
            <Card key={ps.id}>
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center justify-between">
                  <h3 className="font-['Google_Sans_Flex',sans-serif] text-[16px] text-white">{ps.title}</h3>
                  <span className="text-[12px] text-[#22c55e] bg-[rgba(34,197,94,0.2)] px-[8px] py-[4px] rounded-[8px]">
                    {ps.category}
                  </span>
                </div>
                <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">
                  {ps.description}
                </p>
                <div className="flex items-center gap-[8px] mt-[4px]">
                  <span className="text-[12px] text-white opacity-60">{ps.difficulty}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Button onClick={() => onNavigate('problem-statements')} variant="secondary">
          View All Challenges
        </Button>
      </FormSection>

      {/* Timeline */}
      <FormSection title="Event Timeline">
        <div className="flex flex-col gap-[16px]">
          <div className="flex items-start gap-[16px]">
            <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[rgba(34,197,94,0.2)] border border-[#22c55e]">
              <Calendar className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div className="flex-1">
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[16px] text-white">Registration</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">Dec 1 - Dec 20, 2024</p>
            </div>
          </div>
          <div className="flex items-start gap-[16px]">
            <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[rgba(34,197,94,0.2)] border border-[#22c55e]">
              <Users className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div className="flex-1">
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[16px] text-white">Team Formation</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">Dec 1 - Dec 22, 2024</p>
            </div>
          </div>
          <div className="flex items-start gap-[16px]">
            <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[rgba(34,197,94,0.2)] border border-[#22c55e]">
              <FileText className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div className="flex-1">
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[16px] text-white">Capture the Flag (CTF)</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">Jan 15-16, 2025</p>
            </div>
          </div>
          <div className="flex items-start gap-[16px]">
            <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[rgba(34,197,94,0.2)] border border-[#22c55e]">
              <Award className="w-5 h-5 text-[#22c55e]" />
            </div>
            <div className="flex-1">
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[16px] text-white">Results & Awards</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">Jan 20, 2025</p>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Prizes */}
      <FormSection title="Prizes & Benefits">
        <div className="grid grid-cols-3 gap-[16px]">
          <Card>
            <div className="flex flex-col items-center gap-[12px] text-center">
              <div className="flex items-center justify-center w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#4ade80] to-[#22c55e]">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[18px] text-white">1st Prize</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[24px] text-[#22c55e]">$5,000</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center gap-[12px] text-center">
              <div className="flex items-center justify-center w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#C0C0C0] to-[#808080]">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[18px] text-white">2nd Prize</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[24px] text-[#22c55e]">$3,000</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center gap-[12px] text-center">
              <div className="flex items-center justify-center w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#CD7F32] to-[#8B4513]">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[18px] text-white">3rd Prize</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[24px] text-[#22c55e]">$1,500</p>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-[8px]">
          <p className="font-['Google_Sans_Flex',sans-serif] text-[14px] text-white opacity-80">
            • Mentorship from industry experts
          </p>
          <p className="font-['Google_Sans_Flex',sans-serif] text-[14px] text-white opacity-80">
            • Networking opportunities with sponsors
          </p>
          <p className="font-['Google_Sans_Flex',sans-serif] text-[14px] text-white opacity-80">
            • Free swag, meals, and refreshments
          </p>
          <p className="font-['Google_Sans_Flex',sans-serif] text-[14px] text-white opacity-80">
            • Certificate of participation for all attendees
          </p>
        </div>
      </FormSection>

      {/* FAQ */}
      <FormSection title="Frequently Asked Questions">
        <div className="flex flex-col gap-[16px]">
          <div className="flex items-start gap-[12px]">
            <HelpCircle className="w-5 h-5 text-[#22c55e] mt-[2px]" />
            <div>
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[15px] text-white mb-[4px]">Who can participate?</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">
                Students from any university or college can participate. Teams can have 2-5 members.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[12px]">
            <HelpCircle className="w-5 h-5 text-[#22c55e] mt-[2px]" />
            <div>
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[15px] text-white mb-[4px]">Is it free to participate?</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">
                Yes! Registration is completely free. We provide meals, refreshments, and swag.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[12px]">
            <HelpCircle className="w-5 h-5 text-[#22c55e] mt-[2px]" />
            <div>
              <h3 className="font-['Google_Sans_Flex',sans-serif] text-[15px] text-white mb-[4px]">What should I bring?</h3>
              <p className="font-['Google_Sans_Flex',sans-serif] text-[13px] text-white opacity-70">
                Bring your laptop, charger, and enthusiasm! We'll provide everything else.
              </p>
            </div>
          </div>
        </div>
      </FormSection>
    </div>
  );
}

