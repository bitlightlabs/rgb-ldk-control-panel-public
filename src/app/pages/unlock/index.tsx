import { useContextStore } from "@/app/stores/contextStore";
import { errorToText } from "@/lib/errorToText";
import logoDarkAnimation from "@/assets/logo_dark.json";
import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";
import { Field, FieldError } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  removeMnemonicCache,
  removeNodeScopedCache,
  useContextsQuery,
  useNodeMainStatusQuery,
} from "@/app/queries";
import { useNodeUnlockMutation } from "@/app/mutations";
import { useQueryClient } from "@tanstack/react-query";
import { verifyPassword } from "@/lib/commands";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import ForgetDialog from "./components/ForgetDialog";

export function UnlockPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [forget, setForget] = useState(false);
  const [password, setPassword] = useState("");
  const [search] = useSearchParams();
  const queryClient = useQueryClient();

  const previousContext = useContextStore((s) => s.currentContext);
  const setCurrentContext = useContextStore((s) => s.setCurrentContext);

  // Unlocking node id
  const nodeId = search.get("node_id") || "";
  const showBack = search.get("show_back") === "1";

  const contextsQuery = useContextsQuery({
    refetchInterval: false,
  });
  const nodeStatusQuery = useNodeMainStatusQuery(nodeId, {
    enabled: false,
  });
  const unlockMutation = useNodeUnlockMutation();

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
    if (loading) {
      return;
    }

    const targetContext = contextsQuery.data?.find((v) => v.node_id === nodeId);
    if(!targetContext) {
      toast.error("Invalid node");
      return;
    }

    try {
      setLoading(true);
      const ok = await verifyPassword(targetContext.node_id, password);
      if (!ok) {
        setError(true);
        return;
      }

      // Check if node locked
      const status = (await nodeStatusQuery.refetch()).data;
      if (status?.locked) {
        await unlockMutation.mutateAsync(targetContext.node_id);
      }

      if (previousContext?.node_id !== targetContext.node_id) {
        removeNodeScopedCache(queryClient, previousContext?.node_id);
      }
      removeMnemonicCache(queryClient, targetContext.node_id);

      // Save context
      setCurrentContext(targetContext);

      nav("/dashboard");
    } catch (e) {
      toast.error(errorToText(e));
    } finally {
      setLoading(false);
    }
  };

  const preventBack = () => {
    document.onkeydown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        console.log('Backspace pressed');
        const tag = (e.target as HTMLElement).tagName
        if (!['INPUT', 'TEXTAREA'].includes(tag)) {
          e.preventDefault()
        }
      }
    }
  }

  useEffect(() => {
    preventBack()
  }, [])

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

      {
        forget ? (
          <ForgetDialog
            onClose={() => setForget(false)}
          />
        ) : null
      }
    </>
  );
}
