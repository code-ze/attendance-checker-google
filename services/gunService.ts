import { GunUser } from '../types';

// We need to access the global Gun object loaded via script tag in index.html
// since we aren't using npm install for this specific environment constraint.
declare global {
  interface Window {
    Gun: any;
    GUN: any;
  }
}

// Initialize Gun with public relay peers
// Using multiple peers for reliability
const PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-main.herokuapp.com/gun'
];

export const gun = window.Gun ? window.Gun({ peers: PEERS }) : null;
export const user: GunUser = gun ? gun.user() : null;

// Helper to generate a unique ID
export const generateUUID = () => {
  return crypto.randomUUID();
};

export const APP_NAMESPACE = 'qr_attendance_v1_secure';
