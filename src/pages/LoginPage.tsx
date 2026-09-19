import { useId, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { APP_NAME } from "@/constants";
import { getRoleHome } from "@/constants/navigation";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isApiConfigured } from "@/lib/api";
import {
  API_LOGIN_HINTS,
  DEMO_ACCOUNTS,
  getHomeRoute,
  isAuthenticated,
  login,
} from "@/lib/auth";

export default function LoginPage() {
  useDocumentTitle("Login");

  const navigate = useNavigate();
  const formId = useId();
  const usernameId = `${formId}-username`;
  const passwordId = `${formId}-password`;
  const apiMode = isApiConfigured();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await login(username, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(getRoleHome(result.role), { replace: true });
  }

  return (
    <div className="bg-background flex min-h-dvh">
      <div className="bg-sidebar relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden px-12 py-14 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 10%, #1c5752 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 90%, #00332f 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <BrandLogo variant="whiteColor" width={148} maxHeight={88} />
        </div>
        <div className="relative max-w-sm">
          <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sidebar-muted mt-3 text-sm leading-relaxed">
            Sign in to manage inventory, distributors, and customer orders.
          </p>
        </div>
        <p className="text-sidebar-muted relative text-xs">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLogo variant="blackColor" width={128} maxHeight={76} />
          </div>

          <div className="border-border bg-surface rounded-2xl border px-8 py-9 shadow-sm">
            <div className="mb-7">
              <h2 className="text-foreground text-xl font-semibold tracking-tight">
                Sign in
              </h2>
              <p className="text-muted mt-1.5 text-sm">
                {apiMode
                  ? "Use your backend account email and password"
                  : "Enter your credentials to continue"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Label htmlFor={usernameId}>
                  {apiMode ? "Email" : "Username"}
                </Label>
                <Input
                  id={usernameId}
                  name="username"
                  type={apiMode ? "email" : "text"}
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={
                    apiMode ? "admin@example.com" : "Enter username"
                  }
                  className="w-full"
                  required
                />
              </div>

              <div>
                <Label htmlFor={passwordId}>Password</Label>
                <Input
                  id={passwordId}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full"
                  required
                />
              </div>

              {error ? (
                <p className="text-danger text-sm" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="mt-2 w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="text-muted mt-6 space-y-1.5 text-center text-xs leading-relaxed">
              {apiMode ? (
                <>
                  <p>
                    Admin:{" "}
                    <span className="text-muted-strong font-medium">
                      {API_LOGIN_HINTS.superadmin.email}
                    </span>{" "}
                    /{" "}
                    <span className="text-muted-strong font-medium">
                      {API_LOGIN_HINTS.superadmin.password}
                    </span>
                  </p>
                  <p>
                    Warehouse:{" "}
                    <span className="text-muted-strong font-medium">
                      {API_LOGIN_HINTS.warehouse.email}
                    </span>{" "}
                    /{" "}
                    <span className="text-muted-strong font-medium">
                      {API_LOGIN_HINTS.warehouse.password}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Super Admin:{" "}
                    <span className="text-muted-strong font-medium">
                      {DEMO_ACCOUNTS.superadmin.username}
                    </span>{" "}
                    /{" "}
                    <span className="text-muted-strong font-medium">
                      {DEMO_ACCOUNTS.superadmin.password}
                    </span>
                  </p>
                  <p>
                    Warehouse:{" "}
                    <span className="text-muted-strong font-medium">
                      {DEMO_ACCOUNTS.warehouse.username}
                    </span>{" "}
                    /{" "}
                    <span className="text-muted-strong font-medium">
                      {DEMO_ACCOUNTS.warehouse.password}
                    </span>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
