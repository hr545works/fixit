export type UserRole = 'student' | 'committee' | 'admin' | 'management';

export interface User {
  id: string; // admission number for students, username/email for others
  name: string;
  email: string;
  admissionNo?: string; // only present if role is 'student'
  role: UserRole;
  password?: string; // Plain-text for simpler custom authentication in this hackathon prototype
  firstLogin: boolean;
  authority?: 'teachers' | 'management';
  avatarUrl?: string;
  isNew?: boolean; // newly self-registered student
  status?: string; // e.g. newly_created, verified
}

export type ComplaintCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'Internet / Wi-Fi'
  | 'Furniture'
  | 'Classroom Equipment'
  | 'Cleanliness'
  | 'Security'
  | 'Hostel'
  | 'Laboratory'
  | 'Other';

export type PriorityLevel = 'Low' | 'Medium' | 'High';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ResolutionStatus = 'pending' | 'in progress' | 'resolved';

export interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  category: ComplaintCategory;
  description: string;
  location: string;
  imageUrl?: string;
  createdAt: number; // UTC timestamp milliseconds
  priority: PriorityLevel;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  status: ResolutionStatus;
  assignedStaff?: string;
  targetAuthority?: 'teachers' | 'management';
}

export interface CommitteeReview {
  id: string;
  complaintId: string;
  committeeMemberId: string;
  committeeMemberName: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  timestamp: number;
}

export interface MaintenanceLog {
  id: string;
  complaintId: string;
  staffName: string;
  repairNotes: string;
  completionDate: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'new_complaint' | 'status_change' | 'rejection';
  complaintId: string;
  createdAt: number;
  userId?: string; // If targeted to a specific student
  roleTarget?: 'admin' | 'committee' | 'all'; // If targeted to a role
  readBy: string[]; // List of user IDs who have read/dismissed this notification
}

export function getRoleDisplayName(user: { role: string; authority?: string; id?: string }): string {
  if (user.role === 'admin') return 'Administrator';
  if (user.role === 'management') return 'Management';
  if (user.role === 'student') return 'Student';
  if (user.role === 'committee') {
    if (user.authority === 'teachers' || user.id === 'staff') return 'Staff';
    return 'Approval';
  }
  return user.role;
}
