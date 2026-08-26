import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { useContextStore } from "@/app/stores/contextStore";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useRgbLnInvoiceDecodeQuery } from "@/app/queries";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isBitcoinAddress } from "@/lib/utils";

type PayloadKind = "ln-invoice" | "ln-btc-offer" | "onchain_asset" | "onchain_btc" | "unknown";

function detectPayloadKind(value: string): PayloadKind {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized.startsWith("contract:")) return "onchain_asset";
  if (normalized.startsWith("lno")) return "ln-btc-offer";
  if (normalized.startsWith("ln")) return "ln-invoice";
  if (isBitcoinAddress(normalized)) return "onchain_btc";
  return "unknown";
}

// function normalizeLightningPayload(value: string): string {
//   return value
//     .replace(/^lightning:/i, "")
//     .replace(/[\s\u200B-\u200D\uFEFF]+/g, "");
// }

export default function Send() {
  const navigate = useNavigate();
  const [error, setError] = useState<boolean>(false);
  const currentContext = useContextStore((s) => s.currentContext);
  const [payload, setPayload] = useState("");
  const activeNodeId = currentContext?.node_id;

  const payloadKind = useMemo(
    () => detectPayloadKind(payload),
    [payload]
  );

  const tryRgbInvoiceDecodeQuery = useRgbLnInvoiceDecodeQuery(
    activeNodeId,
    payload,
  );

  const changePayload = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPayload(e.target.value.trim());
    setError(false);
  }

  const confirmPay = () => {
    if(payloadKind === 'ln-btc-offer') {
      navigate(
        '/dashboard/send/btc-bolt12-offer?payload=' + encodeURIComponent(payload)
      );
      return
    }

    if(payloadKind === "ln-invoice") {
      if(!tryRgbInvoiceDecodeQuery.data) {
        return
      }

      const isRgbInvoice = !!tryRgbInvoiceDecodeQuery.data.contract_id;
      if(isRgbInvoice) {
        navigate(
          '/dashboard/send/rgb-invoice?payload=' + encodeURIComponent(payload)
        );
      } else {
         navigate(
          '/dashboard/send/btc-bolt11-invoice?payload=' + encodeURIComponent(payload)
        );
      }
      return;
    }

    // if(payloadKind === "onchain_btc") {
    //   navigate(
    //     '/dashboard/send/btc-onchain?payload=' + encodeURIComponent(payload)
    //   );
    //   return
    // }

    setError(true);
  }

  return (
    <ContentWrapper>
      <ContentHeader
        title="Send"
        onBack={() => navigate(-1)}
      />
      <Content className="space-y-8">
        <Field data-invalid={error}>
          <FieldLabel>Recipient</FieldLabel>
          <Textarea
            value={payload}
            onChange={changePayload}
            placeholder="Paste lnbcrt... / lno1... / contract:..."
            className="min-h-[52px] resize-y rounded-3xl"
          />
          {
            error ? (<FieldError>Invalid Invoice</FieldError>) : null
          }
        </Field>
        <div>
          <Button
            type="button"
            size="lg"
            variant="white"
            className="w-full rounded-full"
            disabled={payload === '' || tryRgbInvoiceDecodeQuery.isPending}
            onClick={confirmPay}
          >
            Pay
          </Button>
        </div>
      </Content>
    </ContentWrapper>
  )
}
