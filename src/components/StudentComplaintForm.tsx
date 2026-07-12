import React, { useState } from "react";
import { 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  Trash2, 
  Image as ImageIcon, 
  AlertCircle,
  Wrench,
  Activity,
  UserCheck
} from "lucide-react";
import { User, ComplaintCategory, PriorityLevel } from "../types";

interface StudentComplaintFormProps {
  currentUser: User;
  onComplaintSubmitted: (complaintData: {
    category: ComplaintCategory;
    location: string;
    description: string;
    priority: PriorityLevel;
    targetAuthority: "teachers" | "management";
    imageUrl?: string;
  }) => Promise<void>;
}

const CATEGORIES: { value: ComplaintCategory; label: string; desc: string; icon: string }[] = [
  { value: "Electrical", label: "Electrical", desc: "Fans, lights, power sockets", icon: "⚡" },
  { value: "Plumbing", label: "Plumbing", desc: "Leaking pipes, taps, water coolers", icon: "🚰" },
  { value: "Internet / Wi-Fi", label: "Internet / Wi-Fi", desc: "No connection, slow speed", icon: "🌐" },
  { value: "Furniture", label: "Furniture", desc: "Broken chairs, whiteboards, doors", icon: "🪑" },
  { value: "Classroom Equipment", label: "Classroom", desc: "AC, projectors, smart boards", icon: "🏫" },
  { value: "Cleanliness", label: "Cleanliness", desc: "Trash bins, corridors, washrooms", icon: "🧹" },
  { value: "Security", label: "Security", desc: "Keys, locks, guard services", icon: "🛡️" },
  { value: "Hostel", label: "Hostel", desc: "Mess, laundry, room repairs", icon: "🏢" },
  { value: "Laboratory", label: "Laboratory", desc: "Equipment, chemical storage", icon: "🧪" },
  { value: "Other", label: "Other Issues", desc: "General campus repairs", icon: "🔧" }
];

export default function StudentComplaintForm({ currentUser, onComplaintSubmitted }: StudentComplaintFormProps) {
  // Form values state
  const [category, setCategory] = useState<ComplaintCategory>("Electrical");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>("Medium");
  const [targetAuthority, setTargetAuthority] = useState<"teachers" | "management">("management");
  const [imageFile, setImageFile] = useState<string | null>(null);

  // AI draft states
  const [rawPrompt, setRawPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState(false);

  // Submission states
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // File Upload base64 generator
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Call the AI draft API
  const handleAiDraft = async () => {
    if (!rawPrompt.trim()) {
      setAiError("Please type a rough description of your issue first.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAiSuccess(false);

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: rawPrompt }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || "Failed to generate draft from AI.");
      }

      const draft = await res.json();

      // Check draft parameters and autofill
      if (draft.category) {
        // Ensure category matches standard enum, else default to 'Other'
        const matchedCat = CATEGORIES.find(c => c.value.toLowerCase() === draft.category.toLowerCase() || c.label.toLowerCase() === draft.category.toLowerCase());
        setCategory(matchedCat ? matchedCat.value : "Other");
      }
      if (draft.location) setLocation(draft.location);
      if (draft.description) setDescription(draft.description);
      if (draft.priority) setPriority(draft.priority);
      if (draft.targetAuthority) setTargetAuthority(draft.targetAuthority);

      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 4000);
    } catch (err: any) {
      console.error("AI Draft assistant failed:", err);
      setAiError(err.message || "Ensure your Gemini API Key is specified under Settings > Secrets.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) {
      setSubmitError("Please specify the exact location.");
      return;
    }
    if (!description.trim()) {
      setSubmitError("Please provide a description of the issue.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      await onComplaintSubmitted({
        category,
        location: location.trim(),
        description: description.trim(),
        priority,
        targetAuthority,
        imageUrl: imageFile || undefined
      });
      setSuccess(true);
      // Reset form
      setLocation("");
      setDescription("");
      setImageFile(null);
      setRawPrompt("");
    } catch (err: any) {
      console.error("Complaint submit error:", err);
      setSubmitError(err.message || "Failed to file maintenance complaint ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6 text-left animate-fade-in">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Wrench className="text-teal-400 stroke-[2.5]" size={20} />
            File Complaint Ticket
          </h2>
          <p className="text-xs text-slate-400 mt-1">Submit high-fidelity tickets directly to campus technicians and management</p>
        </div>
        <div className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-mono px-3 py-1 rounded-md uppercase tracking-wider">
          Student ID: <span className="text-teal-400 font-bold">{currentUser.id}</span>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-emerald-400 text-xs flex gap-3 items-center">
          <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
          <div>
            <h5 className="font-bold text-sm uppercase tracking-wider font-mono">Ticket Lodged Successfully!</h5>
            <p className="text-slate-300 mt-0.5">Your ticket has been sent to the Approval Committee. Redirecting to your dashboard to track resolution...</p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-xs flex gap-3 items-start">
          <AlertCircle size={20} className="shrink-0 text-rose-400 mt-0.5" />
          <div>
            <h5 className="font-bold uppercase tracking-wider font-mono">Form Submission Failed</h5>
            <p className="text-slate-400 mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      {/* 1. Spark AI Assistant Draft Block */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-500/10 to-transparent rounded-tr-2xl pointer-events-none"></div>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
            <Sparkles size={15} />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">FixIt Buddy AI Drafter</h4>
            <p className="text-[10px] text-slate-400 font-mono">Autofill forms instantly with real-time semantic analysis</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Type a quick, raw description of the issue (e.g. <em>"my hostel block b room 302 ceiling fan is emitting sparks and not working"</em>) and let our AI model classify categories, set priorities, and write a professional draft.
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            placeholder="Describe the issue here..."
            className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 font-mono shadow-inner"
            disabled={aiLoading}
          />
          <button
            type="button"
            onClick={handleAiDraft}
            disabled={aiLoading || !rawPrompt.trim()}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {aiLoading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles size={13} />
                <span>AI Draft</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <p className="text-[10px] text-rose-400 font-mono mt-2 flex items-center gap-1">
            <AlertCircle size={10} /> {aiError}
          </p>
        )}

        {aiSuccess && (
          <p className="text-[10px] text-emerald-400 font-mono mt-2 flex items-center gap-1">
            <CheckCircle2 size={10} /> Form auto-populated with custom-generated AI drafts!
          </p>
        )}
      </div>

      {/* 2. Main Ticket Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 border border-slate-850 p-6 rounded-2xl relative shadow-xl">
        
        {/* Category Choice */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">
            1. Select Issue Category
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all group cursor-pointer ${
                    isSelected 
                      ? "bg-teal-500/10 border-teal-500/30 text-white shadow-md shadow-teal-500/5 ring-1 ring-teal-500/20" 
                      : "bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200"
                  }`}
                >
                  <div className="text-xl mb-1.5">{cat.icon}</div>
                  <div>
                    <div className={`text-xs font-bold font-mono ${isSelected ? "text-teal-400" : "text-slate-300 group-hover:text-white"}`}>
                      {cat.label}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{cat.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location & Authority Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1">
              <MapPin size={13} className="text-teal-400" />
              2. Specific Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hostel Wing C, Room 402, or Library 1st Floor"
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 font-mono shadow-inner"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1">
              <UserCheck size={13} className="text-teal-400" />
              3. Route Complaint To
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetAuthority("teachers")}
                className={`py-2.5 px-3 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  targetAuthority === "teachers"
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-sm"
                    : "bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200"
                }`}
              >
                <span>👨‍🏫 Teachers/Staff</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetAuthority("management")}
                className={`py-2.5 px-3 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  targetAuthority === "management"
                    ? "bg-violet-500/10 border-violet-500/30 text-violet-400 shadow-sm"
                    : "bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-800 hover:text-slate-200"
                }`}
              >
                <span>🏢 Management</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-500 font-mono pl-1 leading-relaxed">
              *Teachers handle class/lab repairs. Management handles hostels and campus grounds.
            </p>
          </div>
        </div>

        {/* Priority Level */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">
            4. Repair Priority
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["Low", "Medium", "High"] as const).map((lvl) => {
              const isSelected = priority === lvl;
              const lvlColors = {
                Low: isSelected ? "bg-teal-500/15 border-teal-500/40 text-teal-400" : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200",
                Medium: isSelected ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200",
                High: isSelected ? "bg-rose-500/15 border-rose-500/40 text-rose-400" : "bg-slate-950/60 border-slate-850 text-slate-400 hover:text-slate-200"
              };

              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setPriority(lvl)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono transition-all flex items-center justify-center gap-1 cursor-pointer ${lvlColors[lvl]}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{lvl}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Description */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">
            5. Detailed Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Type a professional, detailed explanation of what is broken, what action is needed, and any potential safety hazards..."
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 font-mono shadow-inner min-h-[120px] leading-relaxed"
            required
          />
        </div>

        {/* Image Attachment File Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1">
            <ImageIcon size={13} className="text-teal-400" />
            6. Evidence Photo (Optional)
          </label>
          
          {imageFile ? (
            <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-slate-800 bg-slate-950 h-44">
              <img
                src={imageFile}
                alt="Complaint Report evidence preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setImageFile(null)}
                className="absolute top-2.5 right-2.5 p-1.5 bg-rose-500/90 hover:bg-rose-600 text-white rounded-lg transition-all border border-rose-600/20 cursor-pointer flex items-center justify-center"
                title="Remove evidence photo"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <div className="border border-slate-850 border-dashed rounded-xl p-4 text-center hover:border-slate-700 transition-all cursor-pointer relative bg-slate-950/40">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="Choose an evidence image file to upload"
              />
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <ImageIcon size={18} className="text-slate-500 mb-1" />
                <span className="text-xs font-mono text-slate-400 font-semibold uppercase">Attach Incident Photo</span>
                <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Drag-and-drop or Browse &bull; Max 2MB</span>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || success}
          className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase font-mono shadow-lg shadow-teal-500/10 hover:shadow-teal-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Activity size={13} />
              <span>Lodged Maintenance Ticket</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}
