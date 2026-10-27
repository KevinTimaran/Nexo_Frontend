import { z } from "zod";

/**
 * Esquema de validación para correo electrónico.
 * Debe tener formato de correo válido y no estar vacío.
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "El correo electrónico es requerido")
  .email("Formato de correo electrónico inválido");

/**
 * Esquema de validación para contraseñas seguras:
 * - Mínimo 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]|\p{Lu}/u, "La contraseña debe contener al menos una letra mayúscula")
  .regex(/[0-9]/, "La contraseña debe contener al menos un número")
  .regex(/[^A-Za-z0-9\p{L}\s]/u, "La contraseña debe contener al menos un carácter especial (ej. !@#$%^&*)");

/**
 * Esquema de validación para nombre de usuario:
 * - Mínimo 2 caracteres
 * - Sin símbolos raros (solo letras, espacios, acentos, guiones o apóstrofes)
 */
export const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .regex(/^[\p{L}\s'-]+$/u, "El nombre solo puede contener letras y espacios");

/**
 * Esquema completo para el formulario de inicio de sesión (Login)
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Esquema completo para el formulario de registro (Register)
 */
export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Objeto unificado de validaciones de autenticación
 */
export const authValidations = {
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  login: loginSchema,
  register: registerSchema,
};
