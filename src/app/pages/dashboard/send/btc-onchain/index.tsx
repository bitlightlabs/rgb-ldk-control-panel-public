import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import Fee from "@/app/components/Fee";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


export default function BtcOnchain() {
  const [feeRate, setFeeRate] = useState("0");
  const nav = useNavigate()
  const currentContext = useContextStore((s) => s.currentContext);
  const [search] = useSearchParams()

  const payload = search.get('payload') ?? "";
  const activeNodeId = currentContext?.node_id;

  return (
    <ContentWrapper>
      <ContentHeader
        title="BTC Payment"
        onBack={() => nav(-1)}
      />
      <Content>
        <div className='flex flex-col gap-8'>
          <Field>
            <FieldLabel>To</FieldLabel>
            <Input
              type="text"
              value={payload}
            />
          </Field>
          <Field>
            <FieldLabel>Amount</FieldLabel>
            <Input
              type="text"
              slot={
                <span>sats</span>
              }
            />
          </Field>
          <Field>
            <FieldLabel>Fee</FieldLabel>
            <div>
              <Fee onFeeChange={setFeeRate} />
            </div>
          </Field>
          <div className="flex gap-3">
            <Button
              type="button"
              size="lg"
              variant="destructive"
              className="bg-background-3 w-[120px] shrink-0 rounded-full"
              onClick={() => nav(-1)}
            >Back</Button>
            <Button
              type="button"
              size="lg"
              variant="white"
              className="flex-1 rounded-full"
            >Confirm Payment</Button>
          </div>
        </div>
      </Content>
    </ContentWrapper>
  )
}
