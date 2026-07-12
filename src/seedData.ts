import { User } from './types';

export const OFFICIAL_STUDENTS = [
  { id: '487', name: 'Ramees' },
  { id: '505', name: 'Sabiq c' },
  { id: '518', name: 'Sabiq ptp' },
  { id: '524', name: 'Razi' },
  { id: '528', name: 'Midlaj' },
  { id: '534', name: 'Munawar' },
  { id: '545', name: 'Hashir' },
  { id: '546', name: 'Sinan' },
  { id: '547', name: 'Fahim shan' },
  { id: '548', name: 'Nabhan' },
  { id: '549', name: 'Misbah' },
  { id: '550', name: 'Farhan' },
  { id: '551', name: 'Faiz' },
  { id: '552', name: 'Nasrullah' },
  { id: '555', name: 'afthah' },
  { id: '557', name: 'Swalih' },
  { id: '561', name: 'Athaf' },
  { id: '565', name: 'Marwan' },
  { id: '566', name: 'Fahad' },
  { id: '567', name: 'Sinan kp' },
  { id: '570', name: 'Razi CH' },
  { id: '572', name: 'Nihal t' },
  { id: '573', name: 'Adhil' },
  { id: '574', name: 'Munzir' },
  { id: '577', name: 'Muhsin' },
  { id: '580', name: 'Muhammad' },
  { id: '581', name: 'Sarafas' },
  { id: '583', name: 'Irshad' },
  { id: '786', name: 'S.Shamveel' },
  { id: '805', name: 'Muhammad MN' },
  { id: '841', name: 'Rafi.E' }
];

export const SEED_USERS: User[] = [
  // Administrator Accounts
  {
    id: 'admin',
    name: 'Administrator',
    email: 'admin@college.edu',
    role: 'admin',
    password: 'admin@545',
    firstLogin: false
  },
  // Approval Committee Accounts
  {
    id: 'approval',
    name: 'Approval Committee',
    email: 'approval@college.edu',
    role: 'committee',
    password: 'app@545',
    firstLogin: false
  },
  // Staff / Teacher Accounts
  {
    id: 'staff',
    name: 'Staff Resolver',
    email: 'staff@college.edu',
    role: 'committee',
    authority: 'teachers',
    password: 'staff@545',
    firstLogin: false
  },
  // New Management Accounts
  {
    id: 'management',
    name: 'Management',
    email: 'management@college.edu',
    role: 'management',
    password: 'man@545',
    firstLogin: false
  }
];

// Add the 31 official students to the seed users list
OFFICIAL_STUDENTS.forEach((stud) => {
  SEED_USERS.push({
    id: stud.id,
    name: stud.name,
    email: `${stud.name.toLowerCase().replace(/\s+/g, '')}@college.edu`,
    admissionNo: stud.id,
    role: 'student',
    password: `dh@${stud.id}`,
    firstLogin: true // Force password change for demonstration
  });
});
