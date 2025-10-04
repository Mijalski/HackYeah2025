export interface DroneEvent {
  // Core identification
  detection_id: string;
  timestamp_utc: Date;
  ingestion_time: Date;
  
  // Sensor information
  sensor_id: string;
  sensor_type: 'microphone' | 'camera' | 'radar' | 'visual' | 'manual';
  detection_source: 'acoustic' | 'optical' | 'electromagnetic' | 'human';
  
  // Drone identification
  drone_id?: string;
  classification: 'confirmed' | 'probable' | 'possible' | 'unknown';
  
  // Location data
  latitude: number;
  longitude: number;
  altitude_m?: number;
  
  // Movement data
  speed_mps?: number;
  heading_deg?: number;
  course_vector?: string;
  
  // Detection quality
  signal_strength_dbm?: number;
  confidence: number;
  
  // Legacy/UI fields (for backwards compatibility)
  id?: string; // Maps to detection_id
  timestamp?: Date; // Maps to timestamp_utc
  type?: 'microphone' | 'photo' | 'written' | 'manual'; // Derived from sensor_type
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
