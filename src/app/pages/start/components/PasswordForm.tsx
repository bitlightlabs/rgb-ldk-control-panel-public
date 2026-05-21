import Wrapper from "./Wrapper";
import { LockKeyholeIcon } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input, PasswordInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import IconDot from "@/app/icons/dot";

interface IProps {
  loading?: boolean;
  onNext: (password: string) => void;
}

function testPasswordStrength(password: string): 1 | 2 | 3 {
  let strength: 1 | 2 | 3 = 1;

  if (password.length >= 8 && /[A-Za-z]/.test(password)) {
    strength = 2;
  }
  if (
    password.length >= 12 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  ) {
    strength = 3;
  }

  return strength;
}

export function PasswordForm(props: IProps) {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inputType, setInputType] = useState("password");

  const passwordStrength = testPasswordStrength(password);
  const tip = useMemo(() => {
    if (!password) return null;
    if (passwordStrength === 1)
      return <span className="text-base text-error">Weak</span>;
    if (passwordStrength === 2)
      return <span className="text-base text-warning-2">Medium</span>;
    return <span className="text-base text-success">Strong</span>;
  }, [password, passwordStrength]);

  const gt8 = password.length >= 8;
  const allLetter = /^[A-Za-z]+$/.test(password);
  const allNumber = /^[0-9]+$/.test(password);
  const allSymbol = /^[^A-Za-z0-9]+$/.test(password);
  const match = !!password && password === confirm;

  const valid = gt8 && !allLetter && !allNumber && !allSymbol && match;

  return (
    <Wrapper onBack={() => nav(-1)}>
      <div className="flex items-center justify-center w-[56px] h-[56px] mx-auto bg-background-3 rounded-2xl">
        <LockKeyholeIcon />
      </div>
      <h4 className="mt-5 text-xl text-center font-bold">Create Password</h4>
      <div className="mt-2 text-base text-secondary-foreground text-center">
        This password unlocks Bitlight RLN and is stored securely on your
        device. We cannot recover it for you—please keep it safe.
      </div>
      <Field className="mt-8">
        <Input
          type={inputType}
          placeholder="Create password"
          className="bg-background-4"
          onChange={(e) => setPassword(e.target.value)}
          action={tip}
        />
      </Field>
      <Field className="mt-3">
        <PasswordInput
          placeholder="Confirm password"
          className="bg-background-4"
          onChange={(e) => setConfirm(e.target.value)}
          toggleType={(type) => setInputType(type)}
        />
      </Field>
      <div className="mt-3 text-xs text-secondary-foreground">
        <div
          className="flex h-[18px] items-center gap-2"
          style={{
            color: gt8 ? "var(--success)" : "inherit",
          }}
        >
          <IconDot style={{ opacity: gt8 ? 1 : 0.4 }} />
          <span>8-20 characters</span>
        </div>
        <div
          className="mt-1 flex h-[18px] items-center gap-2"
          style={{
            color:
              password && !allLetter && !allNumber && !allSymbol
                ? "var(--success)"
                : "inherit",
          }}
        >
          <IconDot style={{ opacity: (password && !allLetter && !allNumber && !allSymbol) ? 1 : 0.4 }} />
          <span>At least 2 of: letters, numbers, symbols</span>
        </div>
        <div
          className="mt-1 flex h-[18px] items-center gap-2"
          style={{
            color: match ? "var(--success)" : "inherit",
          }}
        >
          <IconDot style={{ opacity: match ? 1 : 0.4 }} />
          <span>Passwords match</span>
        </div>
      </div>
      <Field className="mt-8">
        <Button
          size="lg"
          variant="white"
          className="w-full rounded-full"
          disabled={!valid || props.loading}
          loading={props.loading}
          onClick={() => props.onNext(password)}
        >
          Continue
        </Button>
      </Field>
    </Wrapper>
  );
}
