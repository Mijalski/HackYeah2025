import { DroneEvent, ClusteredEvent, TrajectoryPoint } from '../types';

// Direct Lambda endpoints - will fail due to CORS without Supabase proxy
const LAMBDA_API_URL = 'https://56gjego43e7zbturce52a4i5ni0hpmnb.lambda-url.eu-north-1.on.aws/raw-data';
const LAMBDA_SUMMARY_API_URL = 'https://56gjego43e7zbturce52a4i5ni0hpmnb.lambda-url.eu-north-1.on.aws/summary';

// Get Supabase proxy URL if available
function getApiUrl(endpoint: 'detections' | 'summary' = 'detections'): string {
  try {
    // Check if running in browser with Vite env vars
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
      const functionName = endpoint === 'summary' ? 'fetch-summaries' : 'fetch-detections';
      return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
    }
  } catch (e) {
    // import.meta.env not available
  }

  // Fallback to direct Lambda (will likely fail with CORS)
  return endpoint === 'summary' ? LAMBDA_SUMMARY_API_URL : LAMBDA_API_URL;
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

// Summary API Response type
interface APISummary {
  id: string;
  timestampStartUtc: string;
  timestampEndUtc: string;
  points: Array<{
    latitude: number;
    longitude: number;
  }>;
  riskLevel: string;
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

// Map API severity to risk level
function mapSeverityToRiskLevel(severity: number): 'low' | 'medium' | 'high' | 'critical' {
  switch (severity) {
    case 0:
      return 'low';
    case 1:
      return 'medium';
    case 2:
      return 'high';
    case 3:
    default:
      return 'critical';
  }
}

// Calculate trajectory from multiple points
function calculateTrajectoryFromPoints(points: Array<{ latitude: number; longitude: number }>, timestamp: Date): {
  trajectory: TrajectoryPoint[];
  projectedHeading: number;
  estimatedSpeed: number;
} {
  // Convert points to trajectory
  const trajectory: TrajectoryPoint[] = points.map((point, index) => ({
    lat: point.latitude,
    lng: point.longitude,
    timestamp: new Date(timestamp.getTime() + index * 60000), // Space out by 1 minute intervals
    isProjected: false,
  }));

  if (points.length < 2) {
    return { trajectory, projectedHeading: 0, estimatedSpeed: 0 };
  }

  // Calculate heading from last two points
  const lastPoint = points[points.length - 1];
  const secondLastPoint = points[points.length - 2];

  const latDiff = lastPoint.latitude - secondLastPoint.latitude;
  const lngDiff = lastPoint.longitude - secondLastPoint.longitude;
  const projectedHeading = (Math.atan2(lngDiff, latDiff) * 180 / Math.PI + 360) % 360;

  // Estimate speed (rough approximation)
  const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // km
  const estimatedSpeed = 40; // Default 40 km/h

  // Add projected future points
  const projectionTime = 30; // minutes
  const projectionDistance = (estimatedSpeed / 60) * projectionTime; // km

  const headingRad = (projectedHeading * Math.PI) / 180;
  const latDelta = (projectionDistance / 111) * Math.cos(headingRad);
  const lngDelta = (projectionDistance / (111 * Math.cos((lastPoint.latitude * Math.PI) / 180))) * Math.sin(headingRad);

  // Add intermediate projected points
  for (let t = 6; t <= projectionTime; t += 6) {
    const ratio = t / projectionTime;
    trajectory.push({
      lat: lastPoint.latitude + latDelta * ratio,
      lng: lastPoint.longitude + lngDelta * ratio,
      timestamp: new Date(timestamp.getTime() + (points.length - 1 + ratio) * 60000),
      isProjected: true,
    });
  }

  return { trajectory, projectedHeading, estimatedSpeed };
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

function transformAPISummary(apiSummary: APISummary, index: number): ClusteredEvent {
  // Używamy timestampStartUtc jako główny znacznik czasu
  const timestampStart = new Date(apiSummary.timestampStartUtc);
  const timestampEnd = new Date(apiSummary.timestampEndUtc);

  const riskLevel = apiSummary.riskLevel;

  // Środek klastra (średnia współrzędnych)
  const centerLat =
    apiSummary.points.reduce((sum, p) => sum + p.latitude, 0) /
    apiSummary.points.length;
  const centerLng =
    apiSummary.points.reduce((sum, p) => sum + p.longitude, 0) /
    apiSummary.points.length;

  // Syntetyczne wydarzenia (dla kompatybilności)
  const events: DroneEvent[] = apiSummary.points.map((point, pointIndex) => {
    const detectionId = `DET-SUM-${timestampStart.getFullYear()}${String(
      timestampStart.getMonth() + 1
    ).padStart(2, '0')}${String(timestampStart.getDate()).padStart(
      2,
      '0'
    )}-${String(timestampStart.getHours()).padStart(
      2,
      '0'
    )}${String(timestampStart.getMinutes()).padStart(
      2,
      '0'
    )}-${index}-${pointIndex}`;

    return {
      detection_id: detectionId,
      timestamp_utc: timestampStart,
      ingestion_time: new Date(),
      sensor_id: `SNR-SUMMARY-${String(index + 1).padStart(3, '0')}`,
      sensor_type: 'radar',
      detection_source: 'electromagnetic',
      classification: 'confirmed',
      latitude: point.latitude,
      longitude: point.longitude,
      confidence: 0.9,
      id: detectionId,
      timestamp: timestampStart,
      type: 'summary',
      description: `Aggregated detection summary from ${timestampStart.toISOString()} to ${timestampEnd.toISOString()}`,
    };
  });

  // Trajektoria (jeśli masz wcześniej zdefiniowaną funkcję)
  const trajectoryData = calculateTrajectoryFromPoints(apiSummary.points, timestampStart);

  // Określenie wzorca (np. na podstawie liczby punktów i dystansu)
  let pattern: 'crossing' | 'hovering' | 'surveillance' | 'transit' = 'transit';
  if (apiSummary.points.length <= 2) {
    pattern = 'hovering';
  } else if (trajectoryData.estimatedSpeed < 10) {
    pattern = 'surveillance';
  } else if (trajectoryData.estimatedSpeed > 50) {
    pattern = 'crossing';
  }

  return {
    id: `incident-${index + 1}`,
    latitude: centerLat,
    longitude: centerLng,
    events,
    timestamp: timestampStart,
    pattern,
    riskLevel,
    trajectory: trajectoryData.trajectory,
    projectedHeading: trajectoryData.projectedHeading,
    estimatedSpeed: trajectoryData.estimatedSpeed,
  };
}


export async function fetchDetections(): Promise<DroneEvent[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    const apiUrl = getApiUrl('detections');

    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    // Add Supabase anon key if available and using Supabase proxy
    try {
      if (typeof import.meta !== 'undefined' &&
        import.meta.env?.VITE_SUPABASE_URL &&
        import.meta.env?.VITE_SUPABASE_ANON_KEY &&
        apiUrl.includes('functions/v1/')) {
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

export async function fetchSummaries(): Promise<ClusteredEvent[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    const apiUrl = getApiUrl('summary');

    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    // Add Supabase anon key if available and using Supabase proxy
    try {
      if (typeof import.meta !== 'undefined' &&
        import.meta.env?.VITE_SUPABASE_URL &&
        import.meta.env?.VITE_SUPABASE_ANON_KEY &&
        apiUrl.includes('functions/v1/')) {
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
    let summaries: APISummary[];

    if (Array.isArray(data)) {
      summaries = data;
    } else if (data.summaries && Array.isArray(data.summaries)) {
      summaries = data.summaries;
    } else if (data.data && Array.isArray(data.data)) {
      summaries = data.data;
    } else {
      console.warn('Unexpected API response format:', data);
      throw new Error('Invalid response format from API');
    }

    // Transform each summary with its index for unique ID generation
    return summaries.map((summary, index) => transformAPISummary(summary, index));
  } catch (error) {
    // Log for debugging
    console.error('API fetch summaries error:', error);

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
