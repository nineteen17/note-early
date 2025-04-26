'use client';

import React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useLoginAdminMutation } from '@/hooks/api/auth';
import { adminLoginSchema } from '@/lib/schemas/auth';
import { ApiError } from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';

// Define the form data type based on the Zod schema
type LoginFormData = z.infer<typeof adminLoginSchema>;

// Component now specifically handles Admin/Teacher Login
export function LoginFeature() {
  const setToken = useAuthStore((s) => s.setToken);

  // Setup React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
    setError: setFormError
  } = useForm<LoginFormData>({
    resolver: zodResolver(adminLoginSchema),
  });

  // Setup the mutation hook
  const {
    mutate: loginMutate,
    isPending,
  } = useLoginAdminMutation({
    onSuccess: (data) => {
      console.log('LoginFeature: Login mutation successful, setting token.');
      toast.success('Login successful!');
      setToken(data.accessToken);
      // Redirect handled by PublicLayout
    },
    onError: (error: ApiError) => {
      console.error('Login mutation error:', error);
      const message = error.message || 'Login failed. Please try again.';
      toast.error(message);
      setFormError('root.serverError', {
        type: String(error.status || 500),
        message: message
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: LoginFormData) => {
    console.log("Form submitted with data:", data);
    loginMutate(data);
  };

  // Extract the root server error for display
  const serverError = formErrors.root?.serverError?.message;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-bold">Admin / Teacher Login</CardTitle>
        <CardDescription className="text-muted-foreground">
          Log in to your NoteEarly account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertTitle>Login Failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              aria-invalid={formErrors.email ? "true" : "false"}
              aria-describedby="email-rhf-error"
              disabled={isPending}
              className={`bg-input border-border ${formErrors.email ? 'border-destructive focus:border-destructive' : ''}`}
              {...register("email")}
            />
            {formErrors.email && (
              <p id="email-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                {formErrors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password"
                    className={`text-sm hover:underline ${isPending ? 'pointer-events-none opacity-50' : ''}`}>
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              aria-invalid={formErrors.password ? "true" : "false"}
              aria-describedby="password-rhf-error"
              disabled={isPending}
              className={`bg-input border-border ${formErrors.password ? 'border-destructive focus:border-destructive' : ''}`}
              {...register("password")}
            />
            {formErrors.password && (
              <p id="password-rhf-error" role="alert" className="text-sm font-medium text-destructive">
                {formErrors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember-me"
              className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              disabled={isPending}
            />
            <Label
              htmlFor="remember-me"
              className={`text-sm font-normal text-muted-foreground ${isPending ? 'opacity-50' : ''}`}
            >
              Remember me on this device
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isPending}
          >
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...</> : 'Sign In'}
          </Button>

          <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center pt-4">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted" disabled={isPending}>
            Sign in with Google
          </Button>
        </CardContent>
      </form>

      <CardFooter className="flex flex-col gap-2 pt-4 text-center text-sm">
        <p>
            <span className="text-muted-foreground">Don&apos;t have an account?{" "}</span>
            <Link href="/signup" className={`underline  ${isPending ? 'pointer-events-none opacity-50' : ''}`}>
              Create an account
            </Link>
        </p>
         <p>
            <span className="text-muted-foreground">Are you a student?{" "}</span>
            <Link href="/student-login" className={`underline  ${isPending ? 'pointer-events-none opacity-50' : ''}`}>
              Login here
            </Link>
        </p>
         <p className="">
          <span className="text-muted-foreground">Need help?{" "}</span>
          <Link href="/support" className={`underline  ${isPending ? 'pointer-events-none opacity-50' : ''}`}>
            Contact Support
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
} 