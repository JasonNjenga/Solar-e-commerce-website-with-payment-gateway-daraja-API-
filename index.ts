// supabase/functions/mpesa-pay/index.ts

// Setup full robust CORS headers so your frontend browser allows the connection
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests smoothly
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get the customer's phone and payment amount from your frontend request
    const { phone, amount } = await req.json()

    if (!phone || !amount) {
      throw new Error("Missing phone number or amount parameters");
    }

    // Clean phone number format to standard 2547XXXXXXXX or 2541XXXXXXXX
    let formattedPhone = phone.trim().replace('+', '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
      formattedPhone = '254' + formattedPhone;
    }

    // 2. Fetch credentials from Supabase Secure Environment Variables
    const consumerKey = Deno.env.get('DARAJA_CONSUMER_KEY')
    const consumerSecret = Deno.env.get('DARAJA_CONSUMER_SECRET')
    const passkey = Deno.env.get('DARAJA_PASSKEY')
    const shortCode = "174379" // Default Daraja Sandbox Shortcode

    if (!consumerKey || !consumerSecret || !passkey) {
      throw new Error("Environment keys are missing on the Supabase dashboard.");
    }

    // 3. Securely Fetch Daraja OAuth Access Token
    const authCredentials = btoa(`${consumerKey}:${consumerSecret}`)
    const tokenResponse = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      method: "GET",
      headers: { "Authorization": `Basic ${authCredentials}` }
    })
    
    if (!tokenResponse.ok) {
      const errorMsg = await tokenResponse.text();
      throw new Error(`Failed to obtain Access Token: ${errorMsg}`);
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 4. Generate Kenya Time (EAT - UTC+3) Timestamp for Daraja compliance
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)!.value;
    
    const timestamp = `${getPart('year')}${getPart('month')}${getPart('day')}${getPart('hour')}${getPart('minute')}${getPart('second')}`;

    // Create the mandatory base64 password string required by Safaricom
    const stkPassword = btoa(`${shortCode}${passkey}${timestamp}`)

    // 5. Fire off the STK Push request to Safaricom
    const stkResponse = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "BusinessShortCode": shortCode,
        "Password": stkPassword,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": Math.ceil(amount), 
        "PartyA": formattedPhone,
        "PartyB": shortCode,
        "PhoneNumber": formattedPhone,
        "CallBackURL": "https://cxqgkmjgpoftlbunetjj.supabase.co/functions/v1/mpesa-callback",
        "AccountReference": "MySolarShop",
        "TransactionDesc": "Solar Equipment Checkout"
      })
    })

    const stkData = await stkResponse.json()

    // 6. Return response back safely to your client browser
    return new Response(JSON.stringify(stkData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})