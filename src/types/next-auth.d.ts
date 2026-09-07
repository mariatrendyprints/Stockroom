import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "staff" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    role: "staff" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "staff" | "admin";
  }
}
