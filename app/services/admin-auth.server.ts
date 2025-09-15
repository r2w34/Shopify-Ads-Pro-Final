import { createCookieSessionStorage, redirect } from "@remix-run/node";
import bcrypt from "bcryptjs";
import { db } from "../db.server";

// Admin session storage
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__admin_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "admin-secret-key"],
    secure: process.env.NODE_ENV === "production",
  },
});

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'support';
  isActive: boolean;
}

export class AdminAuthService {
  static async getSession(request: Request) {
    return sessionStorage.getSession(request.headers.get("Cookie"));
  }

  static async getAdminUser(request: Request): Promise<AdminUser | null> {
    try {
      const session = await this.getSession(request);
      const adminId = session.get("adminId");

      if (!adminId) {
        return null;
      }

      const admin = await db.adminUser.findUnique({
        where: { id: adminId, isActive: true }
      });

      if (!admin) {
        return null;
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role as 'super_admin' | 'admin' | 'support',
        isActive: admin.isActive
      };
    } catch {
      return null;
    }
  }

  static async requireAdminAuth(request: Request): Promise<AdminUser> {
    const session = await this.getSession(request);
    const adminId = session.get("adminId");

    if (!adminId) {
      throw redirect("/admin/login");
    }

    const admin = await db.adminUser.findUnique({
      where: { id: adminId, isActive: true }
    });

    if (!admin) {
      throw redirect("/admin/login");
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as 'super_admin' | 'admin' | 'support',
      isActive: admin.isActive
    };
  }

  static async login(email: string, password: string): Promise<AdminUser | null> {
    const admin = await db.adminUser.findUnique({
      where: { email: email.toLowerCase(), isActive: true }
    });

    if (!admin) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await db.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as 'super_admin' | 'admin' | 'support',
      isActive: admin.isActive
    };
  }

  static async createSession(admin: AdminUser) {
    const session = await sessionStorage.getSession();
    session.set("adminId", admin.id);
    return sessionStorage.commitSession(session);
  }

  static async logout(request: Request) {
    const session = await this.getSession(request);
    return sessionStorage.destroySession(session);
  }

  static async createAdminUser(data: {
    email: string;
    password: string;
    name: string;
    role?: 'super_admin' | 'admin' | 'support';
  }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    return db.adminUser.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role || 'admin',
        isActive: true
      }
    });
  }

  static requireRole(admin: AdminUser, requiredRole: 'super_admin' | 'admin' | 'support') {
    const roleHierarchy = {
      'support': 1,
      'admin': 2,
      'super_admin': 3
    };

    if (roleHierarchy[admin.role] < roleHierarchy[requiredRole]) {
      throw new Response("Insufficient permissions", { status: 403 });
    }
  }
}