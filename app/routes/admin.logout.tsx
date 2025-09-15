import type { ActionFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { AdminAuthService } from "../services/admin-auth.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const sessionCookie = await AdminAuthService.logout(request);
  
  return redirect("/admin/login", {
    headers: {
      "Set-Cookie": sessionCookie,
    },
  });
};

export const loader = async () => {
  return redirect("/admin/login");
};