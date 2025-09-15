import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    return json({ shop: session.shop, success: true });
  } catch (error) {
    return json({ shop: null, success: false, error: "Not authenticated" });
  }
};