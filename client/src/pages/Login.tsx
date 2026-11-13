import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoaderCircle } from "lucide-react";

interface LoginFormState {
  email: string;
  password: string;
  remember: boolean;
}

// CSS variables for login page theme (from design)
const loginTheme = {
  navy950: '#071629',
  navy800: '#102a43',
  navy900: '#0a1d34',
  accent: '#d97706',
  'accent-bright': '#f59e0b',
  'ink-soft': '#dcecf5',
  'ink-muted': '#8196ab',
  danger: '#ff6b7f',
};

export default function Login() {
  const [state, setState] = useState<LoginFormState>({ email: "", password: "", remember: false });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, remember: e.target.checked }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(state.email, state.password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative isolate min-h-screen flex items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${loginTheme.navy950} 0%, ${loginTheme.navy800} 25%, ${loginTheme.navy950} 100%)`,
      }}
    >
      {/* Background decorative grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_varieshadowdark_0px,_transparent_70%)]" />
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[linear-gradient(135deg,_transparent_40%,_rgba(255,255,255,0.03)_50%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6"
      >
        {/* Logo/Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: loginTheme.accent, boxShadow: `0 0 20px ${loginTheme.accent}40` }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h7v7l-9 7h-7v-7z" />
            </svg>
          </div>
        </div>

        <div
          className="relative z-10 backdrop-blur-xl rounded-2xl border p-8 shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          style={{
            backgroundColor: `${loginTheme.navy800}60`,
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          <header className="space-y-2 mb-6">
            <h1 className="text-3xl font-bold text-center leading-tight tracking-[-0.025em] text-white">
              Welcome back
            </h1>
            <p className="text-center text-sm" style={{ color: `${loginTheme['ink-soft']}75` }}>
              Enter your credentials to continue
            </p>
          </header>

          {/* Error alert */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: `${loginTheme.danger}10`, borderColor: `${loginTheme.danger}20`, color: loginTheme.danger }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: loginTheme['ink-soft'] }} htmlFor="email">
                Email
              </label>
              <div
                className="group relative flex items-center rounded-xl transition-all duration-200"
                style={{
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.35)`,
                }}
              >
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={state.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-[rgba(10,29,52,0.60)] border rounded-xl py-3 px-4 placeholder:text-[#8196ab] focus:outline-none focus:ring-0 transition-colors"
                  style={{
                    borderBottomColor: loginTheme['ink-muted'],
                    borderColor: 'rgba(16, 42, 67, 0.60)',
                    color: loginTheme['ink-soft'],
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: loginTheme['ink-soft'] }} htmlFor="password">
                Password
              </label>
              <div
                className="group relative flex items-center rounded-xl transition-all duration-200"
                style={{
                  boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.35)`,
                }}
              >
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={state.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full bg-[rgba(10,29,52,0.60)] border rounded-xl py-3 px-4 placeholder:text-[#8196ab] focus:outline-none focus:ring-0 transition-colors"
                  style={{
                    borderBottomColor: loginTheme['ink-muted'],
                    borderColor: 'rgba(16, 42, 67, 0.60)',
                    color: loginTheme['ink-soft'],
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between -mt-1">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: loginTheme['ink-soft'] }}>
                <input
                  type="checkbox"
                  name="remember"
                  checked={state.remember}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-[rgba(16, 42, 67,0.60)] bg-[rgba(16, 42, 67,0.80)] focus:ring-2 focus:ring-[rgba(217,119,6,0.50)] focus:ring-offset-0"
                />
                <span className="text-sm">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {/* TODO: open forgot password dialog */}}
                className="text-sm font-medium transition-colors"
                style={{ color: loginTheme.accent }}
                onMouseOver={(e) => { e.currentTarget.style.color = loginTheme['accent-bright']; }}
                onMouseOut={(e) => { e.currentTarget.style.color = loginTheme.accent; }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-200 text-white disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(217,119,6,0.35)]"
              style={{
                background: `linear-gradient(110deg, ${loginTheme.accent} 0%, ${loginTheme['accent-bright']} 48%, ${loginTheme.accent} 100%)`,
                backgroundSize: '220% 100%',
                backgroundPosition: 'left',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundPosition = 'right'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundPosition = 'left'; }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderCircle className="size-5 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: `${loginTheme['ink-muted']}60` }}>
              Need access? Contact your store administrator
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}