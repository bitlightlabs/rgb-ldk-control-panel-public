import { BackButton, ContentWrapper } from "@/app/components/ContentWrapper";
import IconBack from "@/app/icons/back";

interface IProps {
  onBack: () => void;
  children?: React.ReactNode;
}

export default function Wrapper(props: IProps) {
  return (
    <div className="h-svh bg-background grid grid-cols-1 items-center justify-center overflow-y-auto">
      <ContentWrapper className="bg-background-3 rounded-3xl px-6 pt-12 pb-6 border border-background-2">
        <BackButton
          onClick={props.onBack}
          className="absolute w-9 h-9 top-2 left-2 flex justify-center items-center rounded-full hover:bg-background-3"
        >
          <IconBack style={{width: '20px', height: '20px'}} />
        </BackButton>
        <div className="mt-1">
          {props.children}
        </div>
      </ContentWrapper>
    </div>
  )
}
