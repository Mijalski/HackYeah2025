// Supabase Edge Function to proxy drone detection data from Lambda
// This bypasses CORS restrictions by making the request server-side

const LAMBDA_URL = 'https://56gjego43e7zbturce52a4i5ni0hpmnb.lambda-url.eu-north-1.on.aws/summary-mock';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Fetch from Lambda endpoint
    const response = await fetch(LAMBDA_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    console.log('response=>', response)
    if (!response.ok) {
      throw new Error(`Lambda returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Return the data with proper CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching from Lambda:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch detections',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});