import React from "react";
import { 
  BookOpen, 
  ShieldCheck, 
  Wrench, 
  UserCheck, 
  Clock, 
  HelpCircle,
  Activity,
  Heart
} from "lucide-react";

export default function StudentAboutUs() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6 text-left animate-fade-in font-sans text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <BookOpen className="text-teal-400 stroke-[2.5]" size={20} />
            About CampusFix
          </h2>
          <p className="text-xs text-slate-400 mt-1">Campus Complaint & Maintenance Management System Blueprint</p>
        </div>
      </div>

      {/* Intro block */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-900 border border-slate-850 p-6 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute -left-16 -bottom-16 w-44 h-44 bg-teal-500/5 rounded-full blur-3xl"></div>
        <div className="md:col-span-8 space-y-3 relative z-10">
          <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">Modernizing Campus Infrastructure</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            CampusFix is a transparent, real-time ticket-routing engine. Created for college campus members, it eliminates paper trails and email backlogs by connecting students directly with verified repair staff and approval committees.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Whether it's a flickering light in your hostel room, a slow Wi-Fi connection during exam season, or a broken desk in a lecture hall, CampusFix automates screening and assigns qualified technicians under direct administrative oversight.
          </p>
        </div>
        <div className="md:col-span-4 flex justify-center">
          <div className="w-24 h-24 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-3xl flex items-center justify-center shadow-lg shadow-teal-500/5 animate-bounce">
            <Wrench size={40} className="stroke-[2]" />
          </div>
        </div>
      </div>

      {/* The 3-Step Lifecycle Workflow */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Activity size={14} className="text-teal-400" /> Transparent Resolution Lifecycle
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Step 1 */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-teal-400 uppercase bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">Step 01</span>
              <BookOpen size={16} className="text-teal-400" />
            </div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Student Files Ticket</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Students identify repair issues, log location, and upload photo evidence. Tickets are automatically categorized and routed to Teachers or Management based on locations.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Step 02</span>
              <ShieldCheck size={16} className="text-indigo-400" />
            </div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Screening Board Reviews</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              An independent Approval Committee screens complaints to verify validity. Valid requests are approved instantly, while duplicate or non-issues are rejected with constructive reasons.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-violet-400 uppercase bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">Step 03</span>
              <UserCheck size={16} className="text-violet-400" />
            </div>
            <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Staff Resolves Issue</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Campus Resolvers assign specialized field technicians, log maintenance notes, and carry out repairs. Students monitor workflow percentage progress in real-time.
            </p>
          </div>

        </div>
      </div>

      {/* Role Directory Quick-Guide */}
      <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4 shadow-md">
        <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
          <HelpCircle size={14} className="text-teal-400" /> Stakeholder Directories & Rules
        </h4>

        <div className="divide-y divide-slate-800/60 space-y-3.5">
          {/* Rule 1 */}
          <div className="pt-0 flex gap-3.5 items-start">
            <div className="p-1.5 bg-teal-500/10 rounded text-teal-400 text-xs mt-0.5 font-bold">ST</div>
            <div>
              <h5 className="text-xs font-bold text-white font-mono uppercase">Student Empowerment</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Log up to any number of classroom or hostel repair requests. Upon first logging in, you are mandated to configure a unique secure password override to secure your portal access.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="pt-3.5 flex gap-3.5 items-start">
            <div className="p-1.5 bg-indigo-500/10 rounded text-indigo-400 text-xs mt-0.5 font-bold">AC</div>
            <div>
              <h5 className="text-xs font-bold text-white font-mono uppercase">Approval Committee</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Acts as the crucial gatekeeper against duplicate tickets and spam. Committee members cannot delete data, ensuring transparent audits of why any ticket was rejected or routed.
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="pt-3.5 flex gap-3.5 items-start">
            <div className="p-1.5 bg-violet-500/10 rounded text-violet-400 text-xs mt-0.5 font-bold">MR</div>
            <div>
              <h5 className="text-xs font-bold text-white font-mono uppercase">Management Resolvers</h5>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Responsible for the deployment of physical technicians (electrical, water, network). Updates resolution notes to provide transparent technical closure feedback.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer credits */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-1">
          <span>Made with</span>
          <Heart size={10} className="text-rose-500 fill-rose-500 animate-pulse" />
          <span>for a Better Digital Campus</span>
        </div>
        <div>V1.2 Active Sandbox</div>
      </div>

    </div>
  );
}



