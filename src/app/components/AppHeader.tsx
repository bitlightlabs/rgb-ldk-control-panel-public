import { NodeSelector } from "@/app/components/NodeSelector";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import mainnetIcon from "@/assets/mainnet.svg";
import regtestIcon from "@/assets/regtest.svg";
import testnet4Icon from "@/assets/testnet4.svg";
import { useBreadcrumbs } from "@/hooks/use-breadcrumb";
import { useContextStore } from "../stores/contextStore";
import IconWallet from "../icons/wallet";
import { Link } from "react-router-dom";

const NETWORK_ICONS: Record<string, string> = {
  mainnet: mainnetIcon,
  regtest: regtestIcon,
  testnet4: testnet4Icon,
};

export function AppHeader() {
  const currentContext = useContextStore((s) => s.currentContext);
  const network = currentContext?.network;
  const networkIcon = network ? NETWORK_ICONS[network] : undefined;

  return (
    <header className="sticky top-0 flex h-[68px] shrink-0 items-center justify-between gap-2 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h2 className="text-xl font-bold">Wallet</h2>
      <div className="h-9 flex items-center gap-2">
        <NodeSelector />
        <div className="h-9 items-center gap-2 rounded-full flex px-2.5 text-sm bg-background-2">
          {networkIcon ? (
            <img
              src={networkIcon}
              alt={`${network} icon`}
              className="h-5 w-5"
            />
          ) : null}
          <span className="text-[13px]">{network?.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}

export function AppBreadcrumb() {
  const breadcrumbs = useBreadcrumbs();

  const menu = [];
  for (let i = 0; i < breadcrumbs.length; i++) {
    menu.push(
      <BreadcrumbItem key={i}>
        <BreadcrumbLink asChild>
          <Link to={breadcrumbs[i].link}>{breadcrumbs[i].title}</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
    // separator
    if (i < breadcrumbs.length - 1) {
      menu.push(<BreadcrumbSeparator key={`${i}-sep`} />);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-[58px] shrink-0 justify-between gap-2 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="h-full flex items-center">
        {
          <Breadcrumb className="flex items-center">
            <IconWallet className="mr-2 h-3 w-3 text-secondary-foreground" />
            <BreadcrumbList>{menu}</BreadcrumbList>
          </Breadcrumb>
        }
      </div>
    </header>
  );
}
