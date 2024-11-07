import { z } from "zod";

export const EmailSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address"),
});
