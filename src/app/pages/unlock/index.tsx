import IconDanger from "@/app/icons/danger";
import { useContextStore } from "@/app/stores/contextStore";
import logoDarkAnimation from "@/assets/logo_dark.json";
import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { nodeMainStatus, nodeUnlock, verifyPassword } from "@/lib/commands";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export function UnlockPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [forget, setForget] = useState(false);
  const [password, setPassword] = useState("");
  const currentContext = useContextStore((s) => s.currentContext);
  const [search] = useSearchParams();
  const [resetText, setResetText] = useState("");

  const showBack = search.get("show_back") === "1";

  const changePassword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(false);
  };

  const enter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      verify();
    }
  };
  const verify = async () => {
    if (!currentContext) {
      return;
    }
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      const ok = await verifyPassword(password, currentContext.password_hash);
      if (!ok) {
        setError(true);
        return;
      }

      // Check if node locked
      const status = await nodeMainStatus(currentContext.node_id);
      if (status.locked) {
        await nodeUnlock(currentContext.node_id);
      }

      nav("/dashboard");
    } catch (e) {
      toast.error("Failed to unlock");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    if (resetText !== "RESET") {
      nav("/");
      return;
    }
  };

  return (
    <>
      <div
        className="relative h-svh bg-background bg-bottom-left bg-no-repeat"
        style={{ backgroundImage: `url(./bg-bottom-2.png)` }}
      >
        <div className="pt-[180px] w-[400px] mx-auto">
          <div className="flex justify-center">
            <Lottie
              animationData={logoDarkAnimation}
              loop
              autoplay
              style={{ width: 80, height: 80 }}
            />
          </div>
          <div className="mt-4 text-2xl font-bold text-center">
            RGB LIGHTNING NODE
          </div>
          <div className="mt-4 mx-auto text-secondary-foreground text-base text-center">
            Welcome back
          </div>
          <Field className="mt-12" data-invalid={error}>
            <PasswordInput
              className="w-full bg-background-4"
              placeholder="Enter your password"
              autoFocus
              disabled={loading}
              value={password}
              onChange={changePassword}
              onKeyUp={enter}
              iconSize="big"
              subfix={
                password === "" ? null : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-secondary-foreground hover:text-foreground"
                    disabled={loading}
                    onClick={verify}
                  >
                    {loading ? (
                      <Spinner
                        className="text-secondary-foreground"
                        style={{ width: "20px", height: "20px" }}
                      />
                    ) : (
                      <ArrowRight
                        style={{ width: "20px", height: "20px" }}
                      />
                    )}
                  </Button>
                )
              }
            />
            {error ? <FieldError>Incorrect Passwords</FieldError> : null}
          </Field>
          {showBack ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                className="h-10 rounded-full"
                onClick={() => nav(-1)}
              >
                <ArrowLeft />
                <span>Back</span>
              </Button>
            </div>
          ) : null}
        </div>

        <div className="absolute bottom-8 left-0 w-full text-center text-base text-secondary-foreground">
          <span
            className="hover:text-foreground hover:underline"
            onClick={() => setForget(true)}
          >
            Forget password?
          </span>
        </div>
      </div>

      <Dialog open={forget} onOpenChange={() => setForget(false)}>
        <DialogContent
          className="w-[560px] px-5 pt-8 pb-5"
          overlayClassName="backdrop-blur-none"
        >
          <DialogHeader>
            <div>
              <div className="w-16 h-16 rounded-full bg-error/12 flex items-center justify-center">
                <IconDanger />
              </div>
              <DialogTitle className="mt-4 text-xl font-bold">
                Reset Node?
              </DialogTitle>
            </div>
          </DialogHeader>
          <div>
            <div className="text-base">
              If you have forgotten your password, a manual reset of the RGB
              Lightning Node is required. This process will wipe all local data
              stored on this node. Ensure you have a secure backup before
              proceeding.
            </div>
            <div className="mt-4 text-base">
              Enter "RESET" to initialize the reset process.
            </div>
            <div className="mt-8">
              <Input
                className="w-full bg-background-4"
                onChange={(e) => setResetText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={() => setForget(false)}
            >
              Cancel
            </Button>
            <Button
              variant="white"
              type="button"
              size="lg"
              className="rounded-full flex-1"
              onClick={reset}
            >
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
