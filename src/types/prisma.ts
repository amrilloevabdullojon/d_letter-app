export type Role = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'AUDITOR' | 'EMPLOYEE' | 'VIEWER'

export type LetterStatus =
  | 'NOT_REVIEWED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'CLARIFICATION'
  | 'FROZEN'
  | 'REJECTED'
  | 'READY'
  | 'PROCESSED'
  | 'DONE'

export type RequestCategory =
  | 'CONSULTATION'
  | 'TECHNICAL'
  | 'DOCUMENTATION'
  | 'COMPLAINT'
  | 'SUGGESTION'
  | 'OTHER'

export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type SlaStatus = 'ON_TIME' | 'AT_RISK' | 'BREACHED'
