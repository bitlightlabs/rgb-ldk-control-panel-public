import { Content, ContentHeader, ContentWrapper } from "@/app/components/ContentWrapper";
import { CustomAssetSelect } from "@/app/components/CustomAssetSelect";
import SwapAmountPercent from "@/app/components/SwapAmountPercent";
import IconArrowDown from "@/app/icons/arrowdown";
import IconChange from "@/app/icons/change";
import IconRefresh from "@/app/icons/refresh";
import IconTriangleDown, { IconTriangleUp } from "@/app/icons/triangle";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ComplexInput } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import ConfirmDialog from "./components/ConfirmDialog";

export default function Swap() {
  const [error, setError] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  const confirmSwap = () => {
    setShowConfirm(true);
  }

  return (
    <ContentWrapper className="mb-10">
      <ContentHeader
        title="Swap"
        onBack={undefined}
      />

      {/* Maker */}
      <Maker />

      {/* Form */}
      <Content className="mt-4 relative space-y-1">
        <button
          type="button"
          className="group absolute z-50 left-[calc(50%-16px)] top-[130px] flex items-center justify-center px-0 py-0 w-8 h-8 bg-background-solid rounded-full border border-background-solid-3"
        >
          <IconArrowDown className="block group-hover:hidden" style={{width: '16px', height: '16px'}} />
          <IconChange className="hidden group-hover:block" style={{width: '16px', height: '16px'}} />
        </button>
        <Field data-invalid={error}>
          <ComplexInput
            style={{fontSize: '22px'}}
            className="bg-background-4"
            top={<h4 className="mb-3 leading-[18px] text-xs text-secondary-foreground">You Send</h4>}
            subfix={
              <div className="absolute right-4 top-12 h-6 flex gap-3 items-center text-foreground">
                <span className="text-base shrink-0">USDT</span>
                <CustomAssetSelect
                  value="USDT"
                  list={[{name: 'USDT'}, {name: 'BTC'}, {name: 'ETH'}]}
                />
              </div>
            }
            bottom={
              <div className="flex justify-between">
                <div
                  className={"text-xs text-secondary-foreground " + (error ? 'text-error!' : '')}
                >
                  Available: 500,000 sats
                </div>
                <SwapAmountPercent
                  list={[{value: 25}, {value: 50}, {value: 75}, {value: 100}]}
                  value={25}
                  onChange={() => {}}
                />
              </div>
            }
          />
        </Field>

        <ComplexInput
          className="bg-background-4"
          style={{fontSize: '22px'}}
          top={<h4 className="mb-3 leading-[18px] text-xs text-secondary-foreground">You Receive</h4>}
          subfix={
            <div className="absolute right-4 top-12 h-6 flex gap-3 items-center ">
              <span className="text-base shrink-0">USDT</span>
              <CustomAssetSelect
                value="USDT"
                list={[{name: 'USDT'}, {name: 'BTC'}, {name: 'ETH'}]}
              />
            </div>
          }
        />

        <div className="mt-4">
          <div className="flex justify-between text-base leading-5">
            <div className="text-secondary-foreground">Min: 100 sats, Max 10,000,000 sats</div>
            <div>1 sat = 0.00000626 USDT</div>
          </div>
        </div>
        <Fee />

        <div className="mt-8">
          <Button
            variant="white"
            size="lg"
            className="w-full rounded-full"
            onClick={confirmSwap}
          >Swap</Button>
        </div>
      </Content>

      {
        showConfirm ? (
          <ConfirmDialog
            onClose={() => setShowConfirm(false)}
          />
        ) : null
      }
    </ContentWrapper>
  )
}

function Maker() {
  return (
    <Content>
      <div className="flex justify-between">
        <h4 className="text-base leading-5">Market Maker</h4>
        <div className="flex gap-3">
          <Status status="active" />
          <Button
            variant="ghost"
            className="h-5 w-5 px-0 py-0 rounded"
          >
            <IconRefresh style={{width: '16px', height: '16px'}} />
          </Button>
        </div>
      </div>
      <div className="mt-3">
        <Select>
          <SelectTrigger className="rounded-3xl bg-background-4 border-background-2">
            <SelectValue placeholder="Market Maker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mm1">Market Maker 1</SelectItem>
            <SelectItem value="mm2">Market Maker 2</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Content>
  )
}

function Fee() {
  const [show, setShow] = useState(false)

  return (
    <div className="mt-4">
      <div className="flex justify-between text-base leading-5">
        <div className="text-secondary-foreground">Total Fee</div>
        <div className="flex gap-2">
          <span>100 sats</span>
          <Button
            variant="ghost"
            className="px-0 py-0 h-5 w-5 rounded"
            onClick={() => setShow(!show)}
          >
            {
              show ? <IconTriangleUp /> : <IconTriangleDown />
            }

          </Button>
        </div>
      </div>

      {
        show ? (
          <div className="mt-3 px-4 py-4 rounded-2xl bg-background-3 space-y-4">
            <div className="h-5 flex justify-between items-center text-base">
              <label className="text-secondary-foreground">Base Fee</label>
              <div>--</div>
            </div>
            <div className="h-5 flex justify-between items-center text-base">
              <label className="text-secondary-foreground">Variable Fee</label>
              <div>--</div>
            </div>
          </div>
        ) : null
      }
    </div>
  )
}


function Status(props: { status: 'active' | 'inactive' }) {
  return (
    <div className="h-5 flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${props.status === 'active' ? 'bg-success' : 'bg-muted-foreground'}`} />
      <span className={`text-xs ${props.status === 'active' ? 'text-success' : 'text-muted-foreground'}`}>
        {props.status === 'active' ? 'Online' : 'Offline'}
      </span>
    </div>
  )
}
