export const QUERY_KEYS = {

  AUTH: ['auth'],

  EMPLOYEES: ['employees'],
  EMPLOYEE: (id) => ['employees', id],

  TEAMS: ['teams'],
  TEAM: (id) => ['teams', id],

  SHIFTS: ['shifts'],
  SHIFT: (id) => ['shifts', id],

  ROTATIONS: ['rotations'],
  ROTATION: (id) => ['rotations', id],
  ROTATION_ACTIVE: ['rotations', 'active'],
  ROTATION_CURRENT_DAY: (id) => ['rotations', id, 'current-day'],

  ROSTERS: (params) => ['rosters', params],
  MY_ROSTER: (params) => ['rosters', 'me', params],
  EMPLOYEE_ROSTER: (id, params) => ['rosters', 'employee', id, params],

  HOLIDAYS: (year) => ['holidays', year],
  HOLIDAY: (id) => ['holidays', id],
  HOLIDAY_CHECK: (date) => ['holidays', 'check', date],

  CLAIMS: (params) => ['claims', params],
  MY_CLAIMS: (params) => ['claims', 'me', params],
  CLAIM: (id) => ['claims', id],

  PAYROLLS: (params) => ['payroll', params],
  PAYROLL: (id) => ['payroll', id],
  MY_PAYROLL: ['payroll', 'me'],
  PAYROLL_PREVIEW: (params) => ['payroll', 'preview', params],

  PROFILE: ['profile'],

  NOTIFICATIONS: ['notifications'],
};