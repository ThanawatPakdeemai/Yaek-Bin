import { z } from "zod";

export const emailValid = (email: string) =>
  z.string().email().safeParse(email.trim()).success;
