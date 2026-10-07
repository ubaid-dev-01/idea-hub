declare global {
  namespace Express {
    interface Locals {
      authUserId?: string;
    }
  }
}

export {};
