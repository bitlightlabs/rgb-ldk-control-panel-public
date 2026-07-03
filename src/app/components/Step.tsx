import { Spinner } from "@/components/ui/spinner"
import IconCircle from "../icons/circle"
import IconSuccess from "../icons/success"
import IconError from "../icons/IconError"
import { cn } from "@/lib/utils"

interface IProps {
  currentStep: number
  currentStatus: 'success' | 'loading' | 'error'
  list: {
    title: string
    description: any
  }[]
}
export default function Step(props: IProps) {
  const { currentStep, currentStatus, list } = props

  const renderIcon = (index: number, status: string) => {
    if(index + 1 < currentStep) {
      return <IconSuccess style={{width: '20px', height: '20px'}} />
    }

    if(index + 1 > currentStep) {
      return <IconCircle style={{width: '20px', height: '20px'}} />
    }

    if(status === 'success') {
      return <IconSuccess style={{width: '20px', height: '20px'}} />
    }

    if(status === 'loading') {
      return <Spinner style={{width: '20px', height: '20px'}} />
    }

    if(status === 'error') {
      return <IconError style={{width: '20px', height: '20px'}} />
    }
  }

  const renderLine = (index: number) => {
    if(index === list.length - 1) {
      return null
    }
    if(index + 1 < currentStep) {
      return <Line active={true} />
    }
    return <Line active={false} />
  }

  return (
    <ul className="space-y-10">
      {
        list.map((item, index) => {
          return (
            <li className="relative" key={index}>
              {renderLine(index)}
              <div className="flex gap-4">
                <div className="w-5">
                  {renderIcon(index, currentStatus)}
                </div>
                <div>
                  <h4
                    className={
                      cn(
                        "text-lg leading-5.5 font-medium",
                        (index + 1 > currentStep ? 'text-secondary-foreground' : '')
                      )
                    }
                  >
                    {item.title}
                  </h4>
                  {
                    item.description ? (
                      <div className="mt-2 leading-5 text-base text-secondary-foreground">
                        {item.description}
                      </div>
                    ) : null
                  }
                </div>
              </div>
            </li>
          )
        })
      }
    </ul>
  )
}

function Line(props: {active: boolean}) {
  return (
    <div
      className={
        cn(
          "absolute left-[10px] top-[20px] w-0 h-[calc(100%+20px)] border-l-[1px] border-dashed",
          props.active ? 'border-success' : 'border-muted-foreground'
        )
      }
    />
  )
}
