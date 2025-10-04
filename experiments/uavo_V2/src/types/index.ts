export interface DroneEvent {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
  type: 'microphone' | 'photo' | 'written' | 'manual';
  confidence?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  description?: string;
  reportedBy?: string;
  attachments?: File[];
}

export interface TrajectoryPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  isProjected?: boolean;
}

export interface ClusteredEvent {
  id: string;
  latitude: number;
  longitude: number;
  events: DroneEvent[];
  timestamp: Date;
  pattern?: 'crossing' | 'hovering' | 'surveillance' | 'transit';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  trajectory?: TrajectoryPoint[];
  projectedHeading?: number;
  estimatedSpeed?: number;
}

export interface Shelter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  type: 'public' | 'private' | 'military';
  available: boolean;
}

export interface EvacuationOrder {
  id: string;
  incidentId: string;
  targetShelterId: string;
  issuedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  radius: number; // km radius from incident to evacuate
  message?: string;
}

export type UserMode = 'civilian' | 'military';
