// import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useActionData, useNavigation, Form } from "@remix-run/react";
import { AdminAuthService } from "../services/admin-auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // If already logged in, redirect to admin dashboard
  const admin = await AdminAuthService.getAdminUser(request);
  if (admin) {
    return redirect("/admin");
  }
  
  // Not logged in, show login page
  return json({});
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const admin = await AdminAuthService.login(email, password);
    
    if (!admin) {
      return json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionCookie = await AdminAuthService.createSession(admin);
    
    return redirect("/admin", {
      headers: {
        "Set-Cookie": sessionCookie,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return json({ error: "Login failed. Please try again." }, { status: 500 });
  }
};

export default function AdminLogin() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin Login - Facebook AI Ads Pro</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .login-container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
              width: 100%;
              max-width: 400px;
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo h1 {
              color: #2c3e50;
              font-size: 1.8rem;
              margin-bottom: 5px;
            }
            .logo p {
              color: #7f8c8d;
              font-size: 0.9rem;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-group label {
              display: block;
              margin-bottom: 5px;
              color: #2c3e50;
              font-weight: 500;
            }
            .form-group input {
              width: 100%;
              padding: 12px;
              border: 2px solid #e1e8ed;
              border-radius: 8px;
              font-size: 16px;
              transition: border-color 0.3s;
            }
            .form-group input:focus {
              outline: none;
              border-color: #3498db;
            }
            .login-btn {
              width: 100%;
              padding: 12px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
              cursor: pointer;
              transition: background 0.3s;
            }
            .login-btn:hover:not(:disabled) {
              background: #2980b9;
            }
            .login-btn:disabled {
              background: #bdc3c7;
              cursor: not-allowed;
            }
            .error {
              background: #e74c3c;
              color: white;
              padding: 12px;
              border-radius: 8px;
              margin-bottom: 20px;
              text-align: center;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #7f8c8d;
              font-size: 0.8rem;
            }
          `
        }} />
      </head>
      <body>
        <div className="login-container">
          <div className="logo">
            <h1>🔐 Admin Login</h1>
            <p>Facebook AI Ads Pro - Administration</p>
          </div>

          {actionData?.error && (
            <div className="error">
              {actionData.error}
            </div>
          )}

          <Form method="post">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                placeholder="admin@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </Form>

          <div className="footer">
            <p>Secure admin access only</p>
          </div>
        </div>
      </body>
    </html>
  );
}