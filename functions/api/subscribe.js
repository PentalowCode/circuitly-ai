// Cloudflare Pages Function to collect email subscriptions
// Emails are stored in Cloudflare KV

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { email } = await request.json();

    // Validate email
    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await env.CIRCUITLY_EMAILS.get(normalizedEmail);
    if (existing) {
      return new Response(
        JSON.stringify({ success: true, message: 'Already subscribed' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Store the email with metadata
    const subscriptionData = {
      email: normalizedEmail,
      subscribedAt: new Date().toISOString(),
      source: 'coming-soon-page',
      userAgent: request.headers.get('User-Agent') || 'unknown',
    };

    await env.CIRCUITLY_EMAILS.put(normalizedEmail, JSON.stringify(subscriptionData));

    // Optional: Also store in a list for easy export
    const listKey = 'email_list';
    const existingList = await env.CIRCUITLY_EMAILS.get(listKey);
    const emailList = existingList ? JSON.parse(existingList) : [];
    emailList.push(normalizedEmail);
    await env.CIRCUITLY_EMAILS.put(listKey, JSON.stringify(emailList));

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully subscribed!' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Server error. Please try again.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
