export interface Student {
  id: string;
  name: string;
}

export interface AttendanceRecord {
  studentId: string;
  name: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
}

export interface SessionData {
  sessionId: string;
  createdAt: number;
  active: boolean;
}

// Gun.js types are loose, defining basic shape for interaction
export interface GunUser {
  is: {
    pub: string;
    alias: string;
  };
  auth: (alias: string, pass: string, cb: (ack: any) => void) => void;
  create: (alias: string, pass: string, cb: (ack: any) => void) => void;
  leave: () => void;
  get: (key: string) => any;
  recall: (opt: any, cb: (ack: any) => void) => void;
}