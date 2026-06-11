import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import IconLightning from "@/app/icons/lightning";
import IconInvoiceOffer from "@/app/icons/invoice-offer";
import IconInvoice from "@/app/icons/invoice";
import IconLink from "@/app/icons/link";

export function ReceivePage() {
  const navigate = useNavigate();

  return (
    <ContentWrapper>
      <ContentHeader
        title="Receive"
        onBack={() => navigate(-1)}
      />
      <Content>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-3 rounded-lg">
            <div className="text-sm text-secondary-foreground">
              Lightning
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-[66px] w-full rounded-2xl justify-between p-5 hover:[&_svg]:text-foreground"
              onClick={() => {
                navigate('/dashboard/receive/rgb-invoice');
              }}
            >
              <div className="flex gap-4 items-center">
                <span className="w-6 h-6"><IconLightning style={{width: 'auto', height: '100%'}} /></span>
                <div className="text-left">
                  <div className="text-sm text-foreground">RGB Lightning</div>
                  <div className="mt-1 text-secondary-foreground font-normal">Receive RGB instantly via Lightning Network</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[66px] w-full rounded-2xl justify-between p-5 hover:[&_svg]:text-foreground"
              onClick={() => {
                navigate('/dashboard/receive/btc-bolt11-invoice');
              }}
            >
              <div className="flex gap-4 items-center">
                <span className="w-6 h-6"><IconInvoice style={{width: 'auto', height: '100%'}} /></span>
                <div className="text-left">
                  <div className="text-sm text-foreground">Lightning Invoice</div>
                  <div className="mt-1 text-secondary-foreground font-normal">One-time payment request with instant settlement</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-[66px] w-full rounded-2xl justify-between p-5 hover:[&_svg]:text-foreground"
              onClick={() => {
                navigate('/dashboard/receive/btc-bolt12-offer');
              }}
            >
              <div className="flex gap-4 items-center">
                <span className="w-6 h-6"><IconInvoiceOffer style={{width: 'auto', height: '100%'}} /></span>
                <div className="text-left">
                  <div className="text-sm text-foreground">Lightning Offer</div>
                  <div className="mt-1 text-secondary-foreground font-normal">Create reusable payment link for flexible amounts</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>

          <div className="space-y-3 mt-7">
            <div className="text-sm text-secondary-foreground">
              OnChain
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-[66px] w-full rounded-2xl justify-between p-5 hover:[&_svg]:text-foreground"
              onClick={() => {
                // setMode("btc_onchain_address");
                // setDescription("Receive BTC OnChain");
                // createMutation.mutate("btc_onchain_address");
                navigate('/dashboard/receive/btc-onchain-address');
              }}
            >
              <div className="flex gap-4 items-center">
                <span className="w-6 h-6"><IconLink style={{width: 'auto', height: '100%'}} /></span>
                <div className="text-left">
                  <div className="text-sm text-foreground">Bitcoin On-chain</div>
                  <div className="mt-1 text-secondary-foreground font-normal">On-chain deposit for large transfers</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>


          </div>
        </div>

          {/* {step === "form" ? (
              <div>
                {mode === "rgb_onchain_invoice" ? (
                  <OnchainInvoiceRGBForm
                    contracts={rgbContractsQuery.data?.contracts ?? []}
                    selectedContractId={currentOnchainContractId}
                    changeContractId={setCurrentOnchainContractId}
                    rgbAssetAmount={rgbAssetAmount}
                    setRgbAssetAmount={setRgbAssetAmount}
                    setCurrentRgbUtxo={setCurrentRgbUtxo}
                    description={description}
                    setDescription={setDescription}
                  />
                ) : null}
              </div>
          ) : null} */}

          {/* {step === "result" && createdValue ? (
            <div>
              {
                mode === 'rgb_onchain_invoice' ? (
                  <ResultReceiveOnchainRGB
                    utxo={currentRgbUtxo}
                    amount={createdAmountMsat}
                    assetName={selectedOnchainRgbContract?.name ?? ''}
                    invoice={createdValue}
                  />
                ) : null
              }
            </div>
          ) : null} */}
      </Content>
    </ContentWrapper>
  );
}
