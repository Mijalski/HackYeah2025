import { DroneEvent, ClusteredEvent, TrajectoryPoint, Shelter } from '../types';

// Polish-Belarusian border area coordinates (Polish side)
// Border at ~23.5, denser near border, sparser deeper into Poland
const borderArea = {
  minLat: 52.0,
  maxLat: 54.0,
  minLng: 22.5,
  maxLng: 23.4, // West of the border (~23.5)
};

const eventTypes: DroneEvent['type'][] = ['microphone', 'photo', 'written', 'manual'];

// Generate mock events - distributed with more near border (23.3-23.4), fewer deeper into Poland
export const mockEvents: DroneEvent[] = [
  // ZONE 1: Very close to border (lng 23.3-23.4) - 25 events - HIGHEST DENSITY
  {
    id: '1',
    latitude: 52.8423,
    longitude: 23.3689,
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    type: 'manual',
    confidence: 0.92,
    altitude: 150,
    heading: 270,
    speed: 45,
    description: 'Small UAV detected moving westward near border',
  },
  {
    id: '2',
    latitude: 53.1234,
    longitude: 23.3567,
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    type: 'photo',
    confidence: 0.78,
    altitude: 200,
    heading: 260,
    speed: 35,
    description: 'Drone photo captured by observer post BP-7',
  },
  {
    id: '3',
    latitude: 52.9876,
    longitude: 23.3901,
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    type: 'microphone',
    confidence: 0.65,
    altitude: 100,
    heading: 275,
    description: 'Microphone drone signal detected close to border',
  },
  {
    id: '4',
    latitude: 53.4521,
    longitude: 23.3345,
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    type: 'manual',
    confidence: 0.88,
    altitude: 180,
    heading: 285,
    speed: 50,
    description: 'Manual input of multiple contacts',
  },
  {
    id: '5',
    latitude: 52.6789,
    longitude: 23.3789,
    timestamp: new Date(Date.now() - 1000 * 60 * 240),
    type: 'written',
    confidence: 0.95,
    altitude: 120,
    heading: 280,
    speed: 38,
    reportedBy: 'Border Guard Station 3',
    description: 'Written drone reporting from border patrol',
  },
  {
    id: '6',
    latitude: 53.2345,
    longitude: 23.3678,
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    type: 'manual',
    confidence: 0.91,
    altitude: 160,
    heading: 265,
    speed: 42,
    description: 'Manual tracking for 5 minutes before signal loss',
  },
  {
    id: '7',
    latitude: 52.7654,
    longitude: 23.3456,
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    type: 'photo',
    confidence: 0.82,
    altitude: 140,
    heading: 270,
    speed: 40,
    description: 'Drone photo from civilian report verified',
  },
  {
    id: '8',
    latitude: 53.3210,
    longitude: 23.3890,
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    type: 'microphone',
    confidence: 0.71,
    altitude: 110,
    heading: 280,
    description: 'Microphone array detection',
  },
  {
    id: '9',
    latitude: 52.3456,
    longitude: 23.3134,
    timestamp: new Date(Date.now() - 1000 * 60 * 300),
    type: 'photo',
    confidence: 0.86,
    altitude: 170,
    heading: 290,
    speed: 38,
    reportedBy: 'Observation Post Alpha',
    description: 'Clear drone photo obtained during daylight patrol',
  },
  {
    id: '10',
    latitude: 53.6543,
    longitude: 23.3765,
    timestamp: new Date(Date.now() - 1000 * 60 * 20),
    type: 'microphone',
    confidence: 0.73,
    altitude: 95,
    heading: 275,
    description: 'Audio signature matches known UAV propeller patterns',
  },
  {
    id: '11',
    latitude: 52.5432,
    longitude: 23.3234,
    timestamp: new Date(Date.now() - 1000 * 60 * 150),
    type: 'written',
    confidence: 0.89,
    altitude: 145,
    heading: 275,
    speed: 40,
    reportedBy: 'Border Station 7',
    description: 'Written report of sustained UAV activity',
  },
  {
    id: '12',
    latitude: 53.7890,
    longitude: 23.3321,
    timestamp: new Date(Date.now() - 1000 * 60 * 75),
    type: 'manual',
    confidence: 0.94,
    altitude: 200,
    heading: 265,
    speed: 55,
    description: 'High-altitude crossing detected manually',
  },
  {
    id: '13',
    latitude: 53.4567,
    longitude: 23.3345,
    timestamp: new Date(Date.now() - 1000 * 60 * 50),
    type: 'microphone',
    confidence: 0.68,
    altitude: 105,
    heading: 270,
    description: 'Multiple acoustic sensors triggered simultaneously',
  },
  {
    id: '14',
    latitude: 52.8765,
    longitude: 23.3432,
    timestamp: new Date(Date.now() - 1000 * 60 * 110),
    type: 'manual',
    confidence: 0.90,
    altitude: 175,
    heading: 285,
    speed: 48,
    description: 'Manual observation with trajectory calculation',
  },
  {
    id: '15',
    latitude: 53.3456,
    longitude: 23.3456,
    timestamp: new Date(Date.now() - 1000 * 60 * 55),
    type: 'microphone',
    confidence: 0.70,
    altitude: 100,
    heading: 275,
    description: 'Faint acoustic signature detected by array',
  },
  {
    id: '16',
    latitude: 53.6789,
    longitude: 23.3012,
    timestamp: new Date(Date.now() - 1000 * 60 * 40),
    type: 'written',
    confidence: 0.88,
    altitude: 148,
    heading: 280,
    speed: 42,
    reportedBy: 'Sector Command East',
    description: 'Formal report of border zone violation',
  },
  {
    id: '17',
    latitude: 52.4123,
    longitude: 23.3721,
    timestamp: new Date(Date.now() - 1000 * 60 * 95),
    type: 'photo',
    confidence: 0.84,
    altitude: 135,
    heading: 270,
    speed: 44,
    description: 'Border zone incursion photographed',
  },
  {
    id: '18',
    latitude: 53.5234,
    longitude: 23.3554,
    timestamp: new Date(Date.now() - 1000 * 60 * 125),
    type: 'manual',
    confidence: 0.91,
    altitude: 165,
    heading: 265,
    speed: 47,
    description: 'Continuous visual tracking near border',
  },
  {
    id: '19',
    latitude: 52.7123,
    longitude: 23.3678,
    timestamp: new Date(Date.now() - 1000 * 60 * 210),
    type: 'written',
    confidence: 0.87,
    altitude: 142,
    heading: 275,
    speed: 39,
    reportedBy: 'Forward Post 12',
    description: 'Official border incursion report',
  },
  {
    id: '20',
    latitude: 53.1987,
    longitude: 23.3287,
    timestamp: new Date(Date.now() - 1000 * 60 * 85),
    type: 'microphone',
    confidence: 0.72,
    altitude: 108,
    heading: 280,
    description: 'Directional microphone detected approach vector',
  },
  {
    id: '21',
    latitude: 52.5987,
    longitude: 23.3821,
    timestamp: new Date(Date.now() - 1000 * 60 * 170),
    type: 'photo',
    confidence: 0.89,
    altitude: 155,
    heading: 270,
    speed: 43,
    description: 'High quality image near border crossing',
  },
  {
    id: '22',
    latitude: 53.8234,
    longitude: 23.3123,
    timestamp: new Date(Date.now() - 1000 * 60 * 235),
    type: 'manual',
    confidence: 0.93,
    altitude: 185,
    heading: 275,
    speed: 51,
    description: 'Northern sector manual detection',
  },
  {
    id: '23',
    latitude: 52.2987,
    longitude: 23.3456,
    timestamp: new Date(Date.now() - 1000 * 60 * 315),
    type: 'written',
    confidence: 0.86,
    altitude: 130,
    heading: 265,
    speed: 36,
    reportedBy: 'Southern Command',
    description: 'Southern border zone activity report',
  },
  {
    id: '24',
    latitude: 53.4789,
    longitude: 23.3621,
    timestamp: new Date(Date.now() - 1000 * 60 * 155),
    type: 'microphone',
    confidence: 0.75,
    altitude: 115,
    heading: 270,
    description: 'Acoustic array confirmed multiple signals',
  },
  {
    id: '25',
    latitude: 52.9345,
    longitude: 23.3234,
    timestamp: new Date(Date.now() - 1000 * 60 * 195),
    type: 'photo',
    confidence: 0.88,
    altitude: 148,
    heading: 280,
    speed: 41,
    description: 'Visual confirmation with photographic evidence',
  },
  
  // ZONE 2: Moderate distance from border (lng 23.15-23.3) - 20 events - MODERATE DENSITY
  {
    id: '26',
    latitude: 53.2109,
    longitude: 23.2098,
    timestamp: new Date(Date.now() - 1000 * 60 * 35),
    type: 'written',
    confidence: 0.93,
    altitude: 140,
    heading: 275,
    speed: 42,
    reportedBy: 'Command Post North',
    description: 'Official written documentation of incursion',
  },
  {
    id: '27',
    latitude: 52.9012,
    longitude: 23.2654,
    timestamp: new Date(Date.now() - 1000 * 60 * 145),
    type: 'manual',
    confidence: 0.87,
    altitude: 165,
    heading: 285,
    speed: 46,
    description: 'Manual sighting confirmed by multiple observers',
  },
  {
    id: '28',
    latitude: 53.0987,
    longitude: 23.2123,
    timestamp: new Date(Date.now() - 1000 * 60 * 65),
    type: 'written',
    confidence: 0.91,
    altitude: 135,
    heading: 270,
    speed: 44,
    reportedBy: 'Guard Station 12',
    description: 'Written incident report filed by station commander',
  },
  {
    id: '29',
    latitude: 52.6543,
    longitude: 23.2567,
    timestamp: new Date(Date.now() - 1000 * 60 * 190),
    type: 'photo',
    confidence: 0.79,
    altitude: 125,
    heading: 265,
    speed: 37,
    description: 'Thermal imaging photo captured at dusk',
  },
  {
    id: '30',
    latitude: 53.8765,
    longitude: 23.2654,
    timestamp: new Date(Date.now() - 1000 * 60 * 130),
    type: 'microphone',
    confidence: 0.74,
    altitude: 118,
    heading: 280,
    description: 'Audio analysis indicates small fixed-wing UAV',
  },
  {
    id: '31',
    latitude: 52.5678,
    longitude: 23.1901,
    timestamp: new Date(Date.now() - 1000 * 60 * 165),
    type: 'manual',
    confidence: 0.89,
    altitude: 158,
    heading: 270,
    speed: 44,
    description: 'Visual confirmation from elevated observation point',
  },
  {
    id: '32',
    latitude: 53.4321,
    longitude: 23.2109,
    timestamp: new Date(Date.now() - 1000 * 60 * 105),
    type: 'written',
    confidence: 0.92,
    altitude: 152,
    heading: 275,
    speed: 45,
    reportedBy: 'Regional HQ',
    description: 'Comprehensive written analysis of flight pattern',
  },
  {
    id: '33',
    latitude: 52.9876,
    longitude: 23.2876,
    timestamp: new Date(Date.now() - 1000 * 60 * 25),
    type: 'photo',
    confidence: 0.87,
    altitude: 138,
    heading: 280,
    speed: 41,
    description: 'Photo documentation with GPS coordinates',
  },
  {
    id: '34',
    latitude: 53.1987,
    longitude: 23.2456,
    timestamp: new Date(Date.now() - 1000 * 60 * 85),
    type: 'microphone',
    confidence: 0.72,
    altitude: 108,
    heading: 270,
    description: 'Directional microphone detected approach vector',
  },
  {
    id: '35',
    latitude: 52.4321,
    longitude: 23.2210,
    timestamp: new Date(Date.now() - 1000 * 60 * 270),
    type: 'photo',
    confidence: 0.85,
    altitude: 155,
    heading: 275,
    speed: 39,
    description: 'High-resolution photo capture during evening patrol',
  },
  {
    id: '36',
    latitude: 53.5678,
    longitude: 23.2543,
    timestamp: new Date(Date.now() - 1000 * 60 * 95),
    type: 'microphone',
    confidence: 0.76,
    altitude: 115,
    heading: 270,
    description: 'Acoustic detection with moderate confidence',
  },
  {
    id: '37',
    latitude: 52.7234,
    longitude: 23.1789,
    timestamp: new Date(Date.now() - 1000 * 60 * 225),
    type: 'manual',
    confidence: 0.88,
    altitude: 145,
    heading: 265,
    speed: 43,
    description: 'Extended tracking sequence inland',
  },
  {
    id: '38',
    latitude: 53.2876,
    longitude: 23.2321,
    timestamp: new Date(Date.now() - 1000 * 60 * 115),
    type: 'written',
    confidence: 0.90,
    altitude: 150,
    heading: 280,
    speed: 46,
    reportedBy: 'Central Command',
    description: 'Formal incident documentation',
  },
  {
    id: '39',
    latitude: 52.8234,
    longitude: 23.2678,
    timestamp: new Date(Date.now() - 1000 * 60 * 175),
    type: 'photo',
    confidence: 0.83,
    altitude: 132,
    heading: 270,
    speed: 38,
    description: 'Multiple angle photo capture',
  },
  {
    id: '40',
    latitude: 53.6234,
    longitude: 23.1876,
    timestamp: new Date(Date.now() - 1000 * 60 * 205),
    type: 'microphone',
    confidence: 0.71,
    altitude: 112,
    heading: 275,
    description: 'Audio signature detected inland',
  },
  {
    id: '41',
    latitude: 52.5123,
    longitude: 23.2432,
    timestamp: new Date(Date.now() - 1000 * 60 * 255),
    type: 'manual',
    confidence: 0.86,
    altitude: 162,
    heading: 270,
    speed: 42,
    description: 'Manual tracking from observation tower',
  },
  {
    id: '42',
    latitude: 53.3567,
    longitude: 23.2789,
    timestamp: new Date(Date.now() - 1000 * 60 * 135),
    type: 'photo',
    confidence: 0.82,
    altitude: 141,
    heading: 265,
    speed: 40,
    description: 'Daylight photographic confirmation',
  },
  {
    id: '43',
    latitude: 52.6789,
    longitude: 23.1567,
    timestamp: new Date(Date.now() - 1000 * 60 * 285),
    type: 'written',
    confidence: 0.89,
    altitude: 136,
    heading: 280,
    speed: 37,
    reportedBy: 'Station 15',
    description: 'Official report of inland penetration',
  },
  {
    id: '44',
    latitude: 53.7456,
    longitude: 23.2234,
    timestamp: new Date(Date.now() - 1000 * 60 * 165),
    type: 'microphone',
    confidence: 0.73,
    altitude: 119,
    heading: 270,
    description: 'Northern sector acoustic detection',
  },
  {
    id: '45',
    latitude: 52.3678,
    longitude: 23.2543,
    timestamp: new Date(Date.now() - 1000 * 60 * 325),
    type: 'manual',
    confidence: 0.85,
    altitude: 128,
    heading: 275,
    speed: 35,
    description: 'Southern observation post manual entry',
  },

  // ZONE 3: Further inland (lng 22.9-23.15) - 10 events - LOWER DENSITY
  {
    id: '46',
    latitude: 52.8423,
    longitude: 23.0689,
    timestamp: new Date(Date.now() - 1000 * 60 * 215),
    type: 'manual',
    confidence: 0.84,
    altitude: 150,
    heading: 270,
    speed: 45,
    description: 'Deep inland penetration detected',
  },
  {
    id: '47',
    latitude: 53.1234,
    longitude: 23.1267,
    timestamp: new Date(Date.now() - 1000 * 60 * 245),
    type: 'photo',
    confidence: 0.78,
    altitude: 144,
    heading: 265,
    speed: 41,
    description: 'Photographic evidence from inland location',
  },
  {
    id: '48',
    latitude: 52.1234,
    longitude: 22.9876,
    timestamp: new Date(Date.now() - 1000 * 60 * 200),
    type: 'photo',
    confidence: 0.81,
    altitude: 130,
    heading: 280,
    speed: 38,
    reportedBy: 'Mobile Unit 4',
    description: 'Photographic evidence from mobile patrol',
  },
  {
    id: '49',
    latitude: 53.4234,
    longitude: 23.0543,
    timestamp: new Date(Date.now() - 1000 * 60 * 295),
    type: 'microphone',
    confidence: 0.69,
    altitude: 105,
    heading: 270,
    description: 'Faint signal detected far inland',
  },
  {
    id: '50',
    latitude: 52.7890,
    longitude: 22.9987,
    timestamp: new Date(Date.now() - 1000 * 60 * 220),
    type: 'manual',
    confidence: 0.83,
    altitude: 138,
    heading: 275,
    speed: 39,
    description: 'Manual observation inland',
  },
  {
    id: '51',
    latitude: 53.2345,
    longitude: 23.1234,
    timestamp: new Date(Date.now() - 1000 * 60 * 265),
    type: 'written',
    confidence: 0.87,
    altitude: 147,
    heading: 270,
    speed: 42,
    reportedBy: 'Inland Station 8',
    description: 'Written report from inland observation',
  },
  {
    id: '52',
    latitude: 52.5234,
    longitude: 23.0123,
    timestamp: new Date(Date.now() - 1000 * 60 * 335),
    type: 'photo',
    confidence: 0.76,
    altitude: 126,
    heading: 265,
    speed: 36,
    description: 'Long-range photographic detection',
  },
  {
    id: '53',
    latitude: 53.6789,
    longitude: 23.1456,
    timestamp: new Date(Date.now() - 1000 * 60 * 185),
    type: 'microphone',
    confidence: 0.70,
    altitude: 110,
    heading: 280,
    description: 'Inland acoustic array detection',
  },
  {
    id: '54',
    latitude: 52.2345,
    longitude: 23.0678,
    timestamp: new Date(Date.now() - 1000 * 60 * 280),
    type: 'manual',
    confidence: 0.82,
    altitude: 142,
    heading: 270,
    speed: 40,
    description: 'Deep penetration manually tracked',
  },
  {
    id: '55',
    latitude: 53.5123,
    longitude: 22.9234,
    timestamp: new Date(Date.now() - 1000 * 60 * 345),
    type: 'written',
    confidence: 0.80,
    altitude: 134,
    heading: 275,
    speed: 37,
    reportedBy: 'Western Station',
    description: 'Far inland incursion report',
  },

  // ZONE 4: Very far inland (lng 22.5-22.9) - 5 events - VERY LOW DENSITY
  {
    id: '56',
    latitude: 52.6234,
    longitude: 22.8234,
    timestamp: new Date(Date.now() - 1000 * 60 * 365),
    type: 'photo',
    confidence: 0.75,
    altitude: 125,
    heading: 270,
    speed: 38,
    description: 'Rare deep inland photographic capture',
  },
  {
    id: '57',
    latitude: 53.3456,
    longitude: 22.7123,
    timestamp: new Date(Date.now() - 1000 * 60 * 395),
    type: 'manual',
    confidence: 0.79,
    altitude: 140,
    heading: 265,
    speed: 41,
    description: 'Unusual deep penetration manually observed',
  },
  {
    id: '58',
    latitude: 52.4567,
    longitude: 22.6456,
    timestamp: new Date(Date.now() - 1000 * 60 * 425),
    type: 'microphone',
    confidence: 0.67,
    altitude: 115,
    heading: 275,
    description: 'Extremely deep inland acoustic detection',
  },
  {
    id: '59',
    latitude: 53.7234,
    longitude: 22.8567,
    timestamp: new Date(Date.now() - 1000 * 60 * 355),
    type: 'written',
    confidence: 0.78,
    altitude: 132,
    heading: 270,
    speed: 39,
    reportedBy: 'Deep Inland Post',
    description: 'Exceptional inland penetration report',
  },
  {
    id: '60',
    latitude: 52.8765,
    longitude: 22.5678,
    timestamp: new Date(Date.now() - 1000 * 60 * 455),
    type: 'photo',
    confidence: 0.73,
    altitude: 128,
    heading: 280,
    speed: 36,
    description: 'Furthest inland detection on record',
  },
];

// Calculate trajectory from events
function calculateTrajectory(events: DroneEvent[]): { 
  trajectory: TrajectoryPoint[], 
  projectedHeading: number, 
  estimatedSpeed: number 
} {
  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Create trajectory points from actual events
  const trajectory: TrajectoryPoint[] = sortedEvents.map(event => ({
    lat: event.latitude,
    lng: event.longitude,
    timestamp: event.timestamp,
    isProjected: false,
  }));

  if (sortedEvents.length < 2) {
    // Single event - project based on heading if available
    const event = sortedEvents[0];
    if (event.heading !== undefined && event.speed) {
      const heading = event.heading;
      const speed = event.speed;
      
      // Project 30 minutes into the future (longer projection)
      const projectionTime = 30; // minutes
      const distance = (speed / 60) * projectionTime; // km
      
      // Convert heading to radians and calculate new position
      const headingRad = (heading * Math.PI) / 180;
      const latDelta = (distance / 111) * Math.cos(headingRad); // ~111km per degree latitude
      const lngDelta = (distance / (111 * Math.cos((event.latitude * Math.PI) / 180))) * Math.sin(headingRad);
      
      // Add intermediate points
      for (let t = 6; t <= projectionTime; t += 6) {
        const ratio = t / projectionTime;
        trajectory.push({
          lat: event.latitude + latDelta * ratio,
          lng: event.longitude + lngDelta * ratio,
          timestamp: new Date(event.timestamp.getTime() + t * 60000),
          isProjected: true,
        });
      }
      
      return { trajectory, projectedHeading: heading, estimatedSpeed: speed };
    }
    
    return { trajectory, projectedHeading: 0, estimatedSpeed: 0 };
  }

  // Calculate average speed and heading from multiple events
  let totalSpeed = 0;
  let speedCount = 0;
  
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const event1 = sortedEvents[i];
    const event2 = sortedEvents[i + 1];
    
    // Calculate distance between events (approximate)
    const latDiff = event2.latitude - event1.latitude;
    const lngDiff = event2.longitude - event1.longitude;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // km
    
    // Calculate time difference
    const timeDiff = (new Date(event2.timestamp).getTime() - new Date(event1.timestamp).getTime()) / 60000; // minutes
    
    if (timeDiff > 0) {
      const speed = (distance / timeDiff) * 60; // km/h
      totalSpeed += speed;
      speedCount++;
    }
  }
  
  const estimatedSpeed = speedCount > 0 ? totalSpeed / speedCount : 40;
  
  // Calculate projected heading from last two points
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const secondLastEvent = sortedEvents[sortedEvents.length - 2];
  
  const latDiff = lastEvent.latitude - secondLastEvent.latitude;
  const lngDiff = lastEvent.longitude - secondLastEvent.longitude;
  const projectedHeading = (Math.atan2(lngDiff, latDiff) * 180 / Math.PI + 360) % 360;
  
  // Project future position based on trajectory - longer projection
  const projectionTime = 30; // minutes (increased for longer trajectories)
  const distance = (estimatedSpeed / 60) * projectionTime; // km
  
  const headingRad = (projectedHeading * Math.PI) / 180;
  const latDelta = (distance / 111) * Math.cos(headingRad);
  const lngDelta = (distance / (111 * Math.cos((lastEvent.latitude * Math.PI) / 180))) * Math.sin(headingRad);
  
  // Add intermediate projected points for smoother trajectory
  for (let t = 6; t <= projectionTime; t += 6) {
    const ratio = t / projectionTime;
    trajectory.push({
      lat: lastEvent.latitude + latDelta * ratio,
      lng: lastEvent.longitude + lngDelta * ratio,
      timestamp: new Date(lastEvent.timestamp.getTime() + t * 60000),
      isProjected: true,
    });
  }
  
  return { trajectory, projectedHeading, estimatedSpeed };
}

// Generate clustered events for AI view - concentrated near border, sparser inland
export const mockClusteredEvents: ClusteredEvent[] = [
  // Border zone clusters (high density)
  {
    id: 'cluster-1',
    latitude: 52.8423,
    longitude: 23.35,
    events: [mockEvents[3], mockEvents[1], mockEvents[0]], // Zone 1, east to west
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    pattern: 'crossing',
    riskLevel: 'critical',
    ...calculateTrajectory([mockEvents[3], mockEvents[1], mockEvents[0]]),
  },
  {
    id: 'cluster-2',
    latitude: 53.2,
    longitude: 23.37,
    events: [mockEvents[7], mockEvents[5], mockEvents[4]], // Zone 1
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    pattern: 'surveillance',
    riskLevel: 'critical',
    ...calculateTrajectory([mockEvents[7], mockEvents[5], mockEvents[4]]),
  },
  {
    id: 'cluster-3',
    latitude: 52.7,
    longitude: 23.36,
    events: [mockEvents[9], mockEvents[6], mockEvents[2]], // Zone 1
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    pattern: 'transit',
    riskLevel: 'high',
    ...calculateTrajectory([mockEvents[9], mockEvents[6], mockEvents[2]]),
  },
  {
    id: 'cluster-4',
    latitude: 53.4,
    longitude: 23.34,
    events: [mockEvents[13], mockEvents[12], mockEvents[11]], // Zone 1
    timestamp: new Date(Date.now() - 1000 * 60 * 75),
    pattern: 'crossing',
    riskLevel: 'high',
    ...calculateTrajectory([mockEvents[13], mockEvents[12], mockEvents[11]]),
  },
  {
    id: 'cluster-5',
    latitude: 53.6,
    longitude: 23.33,
    events: [mockEvents[17], mockEvents[16], mockEvents[14]], // Zone 1
    timestamp: new Date(Date.now() - 1000 * 60 * 85),
    pattern: 'surveillance',
    riskLevel: 'critical',
    ...calculateTrajectory([mockEvents[17], mockEvents[16], mockEvents[14]]),
  },
  {
    id: 'cluster-6',
    latitude: 52.5,
    longitude: 23.35,
    events: [mockEvents[20], mockEvents[18], mockEvents[15]], // Zone 1
    timestamp: new Date(Date.now() - 1000 * 60 * 110),
    pattern: 'hovering',
    riskLevel: 'high',
    ...calculateTrajectory([mockEvents[20], mockEvents[18], mockEvents[15]]),
  },
  {
    id: 'cluster-7',
    latitude: 53.3,
    longitude: 23.32,
    events: [mockEvents[23], mockEvents[21], mockEvents[19]], // Zone 1
    timestamp: new Date(Date.now() - 1000 * 60 * 155),
    pattern: 'transit',
    riskLevel: 'high',
    ...calculateTrajectory([mockEvents[23], mockEvents[21], mockEvents[19]]),
  },
  {
    id: 'cluster-8',
    latitude: 52.9,
    longitude: 23.34,
    events: [mockEvents[24], mockEvents[22], mockEvents[8]], // Zone 1
    timestamp: new Date(Date.now() - 1000 * 60 * 195),
    pattern: 'crossing',
    riskLevel: 'critical',
    ...calculateTrajectory([mockEvents[24], mockEvents[22], mockEvents[8]]),
  },
  
  // Mid-zone clusters (moderate density)
  {
    id: 'cluster-9',
    latitude: 53.1,
    longitude: 23.23,
    events: [mockEvents[32], mockEvents[27], mockEvents[25]], // Zone 2
    timestamp: new Date(Date.now() - 1000 * 60 * 35),
    pattern: 'transit',
    riskLevel: 'medium',
    ...calculateTrajectory([mockEvents[32], mockEvents[27], mockEvents[25]]),
  },
  {
    id: 'cluster-10',
    latitude: 52.7,
    longitude: 23.21,
    events: [mockEvents[33], mockEvents[28], mockEvents[26]], // Zone 2
    timestamp: new Date(Date.now() - 1000 * 60 * 65),
    pattern: 'surveillance',
    riskLevel: 'medium',
    ...calculateTrajectory([mockEvents[33], mockEvents[28], mockEvents[26]]),
  },
  {
    id: 'cluster-11',
    latitude: 53.5,
    longitude: 23.25,
    events: [mockEvents[37], mockEvents[35], mockEvents[30]], // Zone 2
    timestamp: new Date(Date.now() - 1000 * 60 * 130),
    pattern: 'crossing',
    riskLevel: 'medium',
    ...calculateTrajectory([mockEvents[37], mockEvents[35], mockEvents[30]]),
  },
  {
    id: 'cluster-12',
    latitude: 52.8,
    longitude: 23.19,
    events: [mockEvents[41], mockEvents[38], mockEvents[36]], // Zone 2
    timestamp: new Date(Date.now() - 1000 * 60 * 175),
    pattern: 'transit',
    riskLevel: 'medium',
    ...calculateTrajectory([mockEvents[41], mockEvents[38], mockEvents[36]]),
  },
  {
    id: 'cluster-13',
    latitude: 53.4,
    longitude: 23.24,
    events: [mockEvents[43], mockEvents[40], mockEvents[39]], // Zone 2
    timestamp: new Date(Date.now() - 1000 * 60 * 205),
    pattern: 'surveillance',
    riskLevel: 'medium',
    ...calculateTrajectory([mockEvents[43], mockEvents[40], mockEvents[39]]),
  },
  
  // Inland clusters (lower density)
  {
    id: 'cluster-14',
    latitude: 52.8,
    longitude: 23.05,
    events: [mockEvents[47], mockEvents[46], mockEvents[45]], // Zone 3
    timestamp: new Date(Date.now() - 1000 * 60 * 245),
    pattern: 'transit',
    riskLevel: 'low',
    ...calculateTrajectory([mockEvents[47], mockEvents[46], mockEvents[45]]),
  },
  {
    id: 'cluster-15',
    latitude: 53.2,
    longitude: 23.08,
    events: [mockEvents[52], mockEvents[50], mockEvents[48]], // Zone 3
    timestamp: new Date(Date.now() - 1000 * 60 * 280),
    pattern: 'crossing',
    riskLevel: 'low',
    ...calculateTrajectory([mockEvents[52], mockEvents[50], mockEvents[48]]),
  },
  {
    id: 'cluster-16',
    latitude: 52.5,
    longitude: 22.92,
    events: [mockEvents[54], mockEvents[51], mockEvents[49]], // Zone 3/4
    timestamp: new Date(Date.now() - 1000 * 60 * 335),
    pattern: 'transit',
    riskLevel: 'low',
    ...calculateTrajectory([mockEvents[54], mockEvents[51], mockEvents[49]]),
  },
  
  // Deep inland cluster (very low density)
  {
    id: 'cluster-17',
    latitude: 52.9,
    longitude: 22.75,
    events: [mockEvents[59], mockEvents[57], mockEvents[55]], // Zone 4
    timestamp: new Date(Date.now() - 1000 * 60 * 395),
    pattern: 'crossing',
    riskLevel: 'low',
    ...calculateTrajectory([mockEvents[59], mockEvents[57], mockEvents[55]]),
  },
];

// Shelters distributed across the area - more inland, fewer near border
export const mockShelters: Shelter[] = [
  // Zone 1: Near border - fewer shelters
  {
    id: 'shelter-1',
    name: 'Border Guard Station Alpha',
    latitude: 52.85,
    longitude: 23.32,
    capacity: 50,
    type: 'military',
    available: true,
  },
  {
    id: 'shelter-2',
    name: 'Community Center Białowieża',
    latitude: 52.7,
    longitude: 23.28,
    capacity: 120,
    type: 'public',
    available: true,
  },
  
  // Zone 2: Mid-range - more shelters
  {
    id: 'shelter-3',
    name: 'Hajnówka Municipal Shelter',
    latitude: 52.75,
    longitude: 23.15,
    capacity: 200,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-4',
    name: 'Bielsk Podlaski Central',
    latitude: 52.76,
    longitude: 23.18,
    capacity: 150,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-5',
    name: 'Siemiatycze Town Hall',
    latitude: 52.43,
    longitude: 22.87,
    capacity: 100,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-6',
    name: 'Drohiczyn Community Center',
    latitude: 52.4,
    longitude: 22.66,
    capacity: 80,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-7',
    name: 'Sokółka Regional Shelter',
    latitude: 53.4,
    longitude: 23.5,
    capacity: 180,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-8',
    name: 'Augustów Safe Haven',
    latitude: 53.85,
    longitude: 22.98,
    capacity: 160,
    type: 'public',
    available: true,
  },
  
  // Zone 3: Further inland - most shelters
  {
    id: 'shelter-9',
    name: 'Białystok Main Shelter',
    latitude: 53.13,
    longitude: 23.16,
    capacity: 500,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-10',
    name: 'Białystok North District',
    latitude: 53.17,
    longitude: 23.14,
    capacity: 300,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-11',
    name: 'Białystok South Complex',
    latitude: 53.09,
    longitude: 23.18,
    capacity: 250,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-12',
    name: 'Łomża City Center',
    latitude: 53.18,
    longitude: 22.07,
    capacity: 220,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-13',
    name: 'Zambrów Municipal',
    latitude: 52.99,
    longitude: 22.24,
    capacity: 140,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-14',
    name: 'Wysokie Mazowieckie',
    latitude: 52.92,
    longitude: 22.52,
    capacity: 110,
    type: 'public',
    available: true,
  },
  {
    id: 'shelter-15',
    name: 'Suwałki Regional',
    latitude: 54.1,
    longitude: 22.93,
    capacity: 280,
    type: 'public',
    available: true,
  },
  
  // Military shelters (restricted)
  {
    id: 'shelter-16',
    name: 'Military Base Orzysz',
    latitude: 53.81,
    longitude: 21.94,
    capacity: 300,
    type: 'military',
    available: true,
  },
  {
    id: 'shelter-17',
    name: 'Defense Post Czarna',
    latitude: 53.62,
    longitude: 23.37,
    capacity: 75,
    type: 'military',
    available: true,
  },
];
