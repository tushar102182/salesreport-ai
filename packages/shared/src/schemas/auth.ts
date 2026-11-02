import { z } from 'zod';
import { ROLES } from '../constants';

export const PASSWORD_RULES = {
  minLength: 10,
  maxLength: 128,
} as const;

/**
 * Password policy: 10–128 chars with lower, upper, digit and symbol.
 * Error messages are i18n keys resolved by the web app.
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_RULES.minLength, 'password.tooShort')
  .max(PASSWORD_RULES.maxLength, 'password.tooLong')
  .regex(/[a-z]/, 'password.lower')
  .regex(/[A-Z]/, 'password.upper')
  .regex(/[0-9]/, 'password.digit')
  .regex(/[^A-Za-z0-9]/, 'password.symbol');

export const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email('email.invalid'));

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'required').max(PASSWORD_RULES.maxLength),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'name.tooShort').max(100),
  email: emailSchema,
  password: passwordSchema,
  companyName: z.string().trim().min(2, 'name.tooShort').max(120),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'required').max(PASSWORD_RULES.maxLength),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'password.sameAsOld',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const roleSchema = z.enum(ROLES);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'name.tooShort').max(100),
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema.default('staff'),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  role: roleSchema.optional(),
  password: passwordSchema.optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: (typeof ROLES)[number];
  organizationId: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}
