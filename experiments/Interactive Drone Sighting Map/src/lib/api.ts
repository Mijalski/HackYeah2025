import { DroneEvent } from '../types';

// Direct Lambda endpoint - will fail due to CORS without Supabase proxy
const LAMBDA_API_URL = 'https://56gjego43e7zbturce52a4i5ni0hpmnb.lambda-url.eu-north-1.on.aws/raw-data';

// Get Supabase proxy URL if available
function getApiUrl(): string {
  try {
    // Check if running in browser with Vite env vars
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
      return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-detections`;
    }
  } catch (e) {
    // import.meta.env not available
  }
  
  // Fallback to direct Lambda (will likely fail with CORS)
  return LAMBDA_API_URL;
}

// Actual API Response type (camelCase from Lambda)
interface APIDetection {
  timestampUtc: string;
  latitude: number;
  longitude: number;
  confidence: number;
  sensorType: string; // "RADAR", "CAMERA", "MICROPHONE", etc.
  detectionSource: string; // "radar_tracking_v2", etc.
  classification: string; // "DRONE", etc.
  altitude?: number;
  speed?: number;
  heading?: number;
  signalStrength?: number;
  droneId?: string;
}

// Map API sensorType to our sensor_type format
function mapSensorType(apiSensorType: string): 'microphone' | 'camera' | 'radar' | 'visual' | 'manual' {
  const normalized = apiSensorType.toLowerCase();
  switch (normalized) {
    case 'microphone':
    case 'acoustic':
      return 'microphone';
    case 'camera':
    case 'optical':
      return 'camera';
    case 'radar':
    case 'electromagnetic':
      return 'radar';
    case 'visual':
      return 'visual';
    case 'manual':
    default:
      return 'manual';
  }
}

// Map API detectionSource to our detection_source format
function mapDetectionSource(apiDetectionSource: string): 'acoustic' | 'optical' | 'electromagnetic' | 'human' {
  const normalized = apiDetectionSource.toLowerCase();
  if (normalized.includes('radar') || normalized.includes('electromagnetic')) {
    return 'electromagnetic';
  }
  if (normalized.includes('acoustic') || normalized.includes('microphone')) {
    return 'acoustic';
  }
  if (normalized.includes('optical') || normalized.includes('camera')) {
    return 'optical';
  }
  return 'human';
}

// Map API classification to our format
function mapClassification(apiClassification: string): 'confirmed' | 'probable' | 'possible' | 'unknown' {
  const normalized = apiClassification.toLowerCase();
  if (normalized === 'drone' || normalized === 'confirmed') {
    return 'confirmed';
  }
  if (normalized === 'probable' || normalized === 'likely') {
    return 'probable';
  }
  if (normalized === 'possible' || normalized === 'suspected') {
    return 'possible';
  }
  return 'unknown';
}

// Map sensor_type to legacy type for backward compatibility
function mapSensorTypeToLegacyType(sensorType: string): 'microphone' | 'photo' | 'written' | 'manual' {
  switch (sensorType) {
    case 'microphone':
      return 'microphone';
    case 'camera':
      return 'photo';
    case 'radar':
      return 'written';
    case 'visual':
    case 'manual':
    default:
      return 'manual';
  }
}

// Transform API response to DroneEvent format
function transformAPIDetection(apiDetection: APIDetection, index: number): DroneEvent {
  const timestamp = new Date(apiDetection.timestampUtc);
  const now = new Date();
  const sensorType = mapSensorType(apiDetection.sensorType);
  const detectionSource = mapDetectionSource(apiDetection.detectionSource);
  const classification = mapClassification(apiDetection.classification);
  
  // Generate detection ID from timestamp
  const detectionId = `DET-API-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}-${index}`;
  
  // Generate sensor ID based on sensor type
  const sensorId = `SNR-${apiDetection.sensorType.toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
  
  return {
    detection_id: detectionId,
    timestamp_utc: timestamp,
    ingestion_time: now,
    sensor_id: sensorId,
    sensor_type: sensorType,
    detection_source: detectionSource,
    drone_id: apiDetection.droneId,
    classification: classification,
    latitude: apiDetection.latitude,
    longitude: apiDetection.longitude,
    altitude_m: apiDetection.altitude,
    speed_mps: apiDetection.speed,
    heading_deg: apiDetection.heading,
    signal_strength_dbm: apiDetection.signalStrength,
    confidence: apiDetection.confidence,
    // Legacy fields for backward compatibility
    id: detectionId,
    timestamp: timestamp,
    type: mapSensorTypeToLegacyType(sensorType),
  };
}

export async function fetchDetections(): Promise<DroneEvent[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    const apiUrl = getApiUrl();

    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    // Add Supabase anon key if available and using Supabase proxy
    try {
      if (typeof import.meta !== 'undefined' && 
          import.meta.env?.VITE_SUPABASE_URL && 
          import.meta.env?.VITE_SUPABASE_ANON_KEY &&
          apiUrl.includes('functions/v1/fetch-detections')) {
        headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
      }
    } catch (e) {
      // import.meta.env not available, skip auth header
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle error responses from proxy
    if (data.error) {
      console.error('API error response:', data);
      throw new Error(data.message || 'API returned an error');
    }
    
    // Handle different possible response formats
    let detections: APIDetection[];
    
    if (Array.isArray(data)) {
      detections = data;
    } else if (data.detections && Array.isArray(data.detections)) {
      detections = data.detections;
    } else if (data.data && Array.isArray(data.data)) {
      detections = data.data;
    } else {
      console.warn('Unexpected API response format:', data);
      throw new Error('Invalid response format from API');
    }

    // Transform each detection with its index for unique ID generation
    return detections.map((detection, index) => transformAPIDetection(detection, index));
  } catch (error) {
    // Log for debugging
    console.error('API fetch error:', error);
    
    // Re-throw with appropriate error message
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timeout');
      }
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        // CORS or network issue - Lambda endpoint needs CORS configuration
        throw new Error('API unavailable due to CORS');
      }
    }
    throw error;
  }
}
