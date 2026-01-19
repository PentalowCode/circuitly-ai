// Cloudflare Pages Function to export collected emails
// Protected by a simple API key

export async function onRequestGet(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  // Check for API key in header
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  try {
    // Get the email list
    const listKey = 'email_list';
    const existingList = await env.CIRCUITLY_EMAILS.get(listKey);
    const emailList = existingList ? JSON.parse(existingList) : [];

    // Get full details for each email
    const emails = await Promise.all(
      emailList.map(async (email) => {
        const data = await env.CIRCUITLY_EMAILS.get(email);
        return data ? JSON.parse(data) : { email, subscribedAt: 'unknown' };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        count: emails.length,
        emails: emails,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to export emails' }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
