import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Lock, LogIn, UserPlus, Users, Loader2 } from "lucide-react";

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, displayName?: string, totalStudents?: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const loginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

const signupSchema = Yup.object().shape({
  displayName: Yup.string().required("Full name is required"),
  email: Yup.string().email("Invalid email address").required("Email is required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
  totalStudents: Yup.number().min(0, "Total students cannot be negative").transform((v) => (v === "" || v === null ? undefined : v)).nullable(),
});

export function AuthForm({ onLogin, onSignup, loading, error }: AuthFormProps) {
  const [isSignup, setIsSignup] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
      displayName: "",
      totalStudents: "",
    },
    validationSchema: isSignup ? signupSchema : loginSchema,
    onSubmit: async (values) => {
      if (isSignup) {
        await onSignup(
          values.email,
          values.password,
          values.displayName || undefined,
          values.totalStudents ? parseInt(values.totalStudents as any) : undefined
        );
      } else {
        await onLogin(values.email, values.password);
      }
    },
  });

  const toggleMode = () => {
    setIsSignup(!isSignup);
    formik.resetForm();
  };

  return (
    <div className="w-full space-y-8">
      {/* Centralized Header */}
      <div className="flex flex-col items-center gap-0">
        <img 
          src="/scholar-deet-logo.png" 
          alt="Scholar Deet" 
          className="h-36 w-36 shrink-0 dark:brightness-110 dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
        />
        <h2 className="text-2xl font-bold text-foreground -mt-6">
          {isSignup ? "Sign Up" : "Sign In"}
        </h2>
      </div>

      <form onSubmit={formik.handleSubmit} className="w-full space-y-4">
      {isSignup && (
        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-sm font-medium text-foreground">Full Name</Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="John Doe"
            value={formik.values.displayName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`h-11 rounded-xl border-border bg-muted/50 focus:bg-background ${
              formik.touched.displayName && formik.errors.displayName ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          {formik.touched.displayName && formik.errors.displayName && (
            <p className="text-[11px] font-medium text-destructive px-1">{formik.errors.displayName}</p>
          )}
        </div>
      )}
      
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="instructor@school.edu"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={`h-11 rounded-xl border-border bg-muted/50 focus:bg-background ${
            formik.touched.email && formik.errors.email ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
        {formik.touched.email && formik.errors.email && (
          <p className="text-[11px] font-medium text-destructive px-1">{formik.errors.email}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className={`h-11 rounded-xl border-border bg-muted/50 focus:bg-background ${
            formik.touched.password && formik.errors.password ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
        />
        {formik.touched.password && formik.errors.password && (
          <p className="text-[11px] font-medium text-destructive px-1">{formik.errors.password}</p>
        )}
      </div>

      {isSignup && (
        <div className="space-y-1.5">
          <Label htmlFor="totalStudents" className="text-sm font-medium text-foreground">Total Students</Label>
          <Input
            id="totalStudents"
            name="totalStudents"
            type="number"
            placeholder="e.g. 30"
            value={formik.values.totalStudents}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={`h-11 rounded-xl border-border bg-muted/50 focus:bg-background ${
              formik.touched.totalStudents && formik.errors.totalStudents ? "border-destructive focus-visible:ring-destructive" : ""
            }`}
          />
          {formik.touched.totalStudents && formik.errors.totalStudents && (
            <p className="text-[11px] font-medium text-destructive px-1">{formik.errors.totalStudents}</p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-sm transition-all active:scale-[0.98]"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : isSignup ? (
          <UserPlus className="h-4 w-4 mr-2" />
        ) : (
          <LogIn className="h-4 w-4 mr-2" />
        )}
        {isSignup ? "Create Account" : "Sign In"}
      </Button>

      <button
        type="button"
        onClick={toggleMode}
        className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium transition-colors"
      >
        {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </form>
    </div>
  );
}
