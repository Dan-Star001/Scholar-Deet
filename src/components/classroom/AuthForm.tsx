import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import {
  Button,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { 
  Login as LoginIcon, 
  PersonAdd as PersonAddIcon, 
  Visibility, 
  VisibilityOff 
} from "@mui/icons-material";

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, displayName?: string, totalStudents?: number) => Promise<void>;
  loading: boolean;
  error: string | null;
  onClearError?: () => void;
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

export function AuthForm({ onLogin, onSignup, loading, error, onClearError }: AuthFormProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (onClearError) onClearError();
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
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
        <Typography variant="h5" className="font-bold text-foreground -mt-6">
          {isSignup ? "Create Account" : "Sign In"}
        </Typography>
      </div>

      <form onSubmit={formik.handleSubmit} className="w-full space-y-5">
        {isSignup && (
          <TextField
            fullWidth
            id="displayName"
            name="displayName"
            label="Full Name"
            placeholder="John Doe"
            value={formik.values.displayName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.displayName && Boolean(formik.errors.displayName)}
            helperText={formik.touched.displayName && formik.errors.displayName}
            variant="outlined"
          />
        )}
        
        <TextField
          fullWidth
          id="email"
          name="email"
          label="Email Address"
          type="email"
          placeholder="instructor@school.edu"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.email && Boolean(formik.errors.email)}
          helperText={formik.touched.email && formik.errors.email}
          variant="outlined"
        />

        <TextField
          fullWidth
          id="password"
          name="password"
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={formik.values.password}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.password && Boolean(formik.errors.password)}
          helperText={formik.touched.password && formik.errors.password}
          variant="outlined"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePassword}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        {isSignup && (
          <TextField
            fullWidth
            id="totalStudents"
            name="totalStudents"
            label="Total Students"
            type="number"
            placeholder="e.g. 30"
            value={formik.values.totalStudents}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.totalStudents && Boolean(formik.errors.totalStudents)}
            helperText={formik.touched.totalStudents && formik.errors.totalStudents}
            variant="outlined"
          />
        )}

        {error && (
          <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive border border-destructive/20 font-medium">
            {error}
          </div>
        )}

        <Button
          fullWidth
          type="submit"
          disabled={loading}
          variant="contained"
          size="large"
          className="h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold shadow-md normal-case"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : (isSignup ? <PersonAddIcon /> : <LoginIcon />)}
        >
          {isSignup ? "Create Account" : "Sign In"}
        </Button>

        <Button
          fullWidth
          onClick={toggleMode}
          variant="text"
          className="text-primary normal-case font-bold"
        >
          {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </Button>
      </form>
    </div>
  );
}
