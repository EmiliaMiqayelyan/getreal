import { useId, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { APP_NAME, ROUTES } from "@/constants";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { DEMO_CREDENTIALS, isAuthenticated, login } from "@/lib/auth";

export default function LoginPage() {
  useDocumentTitle("Login");

  const navigate = useNavigate();
  const formId = useId();
  const usernameId = `${formId}-username`;
  const passwordId = `${formId}-password`;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated()) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!login(username, password)) {
      setError("Invalid username or password.");
      return;
    }

    navigate(ROUTES.dashboard, { replace: true });
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
          <img
            src="/logo.png"
            alt={APP_NAME}
            width={160}
            height={70}
            className="h-auto w-[160px]"
          />
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
          <div className="mb-8 lg:hidden">
            <img
              src="/logo.png"
              alt={APP_NAME}
              width={138}
              height={61}
              className="mx-auto h-auto w-[138px]"
            />
          </div>

          <div className="border-border bg-surface rounded-2xl border px-8 py-9 shadow-sm">
            <div className="mb-7">
              <h2 className="text-foreground text-xl font-semibold tracking-tight">
                Sign in
              </h2>
              <p className="text-muted mt-1.5 text-sm">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <Label htmlFor={usernameId}>Username</Label>
                <Input
                  id={usernameId}
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
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
                  required
                />
              </div>

              {error ? (
                <p className="text-danger text-sm" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="mt-2 w-full">
                Sign in
              </Button>
            </form>

            <p className="text-muted mt-6 text-center text-xs leading-relaxed">
              Demo login:{" "}
              <span className="text-muted-strong font-medium">
                {DEMO_CREDENTIALS.username}
              </span>{" "}
              /{" "}
              <span className="text-muted-strong font-medium">
                {DEMO_CREDENTIALS.password}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
