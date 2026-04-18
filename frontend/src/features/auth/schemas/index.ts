import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be no more than 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, underscores, and hyphens'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const totpSchema = z.object({
  token: z
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
});

export const backupCodeSchema = z.object({
  code: z
    .string()
    .min(8, 'Invalid backup code')
    .max(12, 'Invalid backup code')
    .transform((val) => val.toUpperCase().replace(/[-\s]/g, '')),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type TotpFormData = z.infer<typeof totpSchema>;
export type BackupCodeFormData = z.infer<typeof backupCodeSchema>;
