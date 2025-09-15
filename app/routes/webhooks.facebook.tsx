import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { FacebookWebhookService } from "../services/facebook-webhooks.server";

// Handle webhook verification (GET request)
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  console.log('Facebook webhook verification request:', { mode, token, challenge });

  if (mode && token && challenge) {
    const verificationResponse = FacebookWebhookService.handleVerification(mode, token, challenge);
    
    if (verificationResponse) {
      return new Response(verificationResponse, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }

  return new Response('Forbidden', { status: 403 });
}

// Handle webhook events (POST request)
export async function action({ request }: ActionFunctionArgs) {
  try {
    const signature = request.headers.get('x-hub-signature-256');
    const body = await request.text();

    console.log('Facebook webhook event received');
    console.log('Signature:', signature);
    console.log('Body length:', body.length);

    // Verify webhook signature
    if (!signature || !FacebookWebhookService.verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Parse webhook event
    let event;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Process the webhook event
    await FacebookWebhookService.processWebhookEvent(event);

    return json({ success: true });
  } catch (error: any) {
    console.error('Facebook webhook processing error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}