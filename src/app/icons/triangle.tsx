export default function IconTriangleDown(props: React.SVGProps<SVGSVGElement> & {opacity?: number}) {
  const opacity = props.opacity ?? 0.6;

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6.32422 9.58045V8.97727C6.32422 8.57561 6.64983 8.25 7.05149 8.25H12.0905C12.4921 8.25 12.8177 8.57561 12.8177 8.97727V9.58045C12.8177 9.7684 12.745 9.94905 12.6147 10.0845L9.89862 12.9092C9.71978 13.0952 9.42216 13.0952 9.24332 12.9092L6.52725 10.0845C6.39698 9.94905 6.32422 9.7684 6.32422 9.58045Z" fill="currentColor" fillOpacity={opacity}/>
    </svg>
  )
}

export function IconTriangleUp(props: React.SVGProps<SVGSVGElement> & {opacity?: number}) {
  const opacity = props.opacity ?? 0.6;

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6.32422 11.9196V12.5227C6.32422 12.9244 6.64983 13.25 7.05149 13.25H12.0905C12.4921 13.25 12.8177 12.9244 12.8177 12.5227V11.9196C12.8177 11.7316 12.745 11.551 12.6147 11.4155L9.89862 8.59076C9.71978 8.40476 9.42216 8.40476 9.24332 8.59076L6.52725 11.4155C6.39698 11.551 6.32422 11.7316 6.32422 11.9196Z" fill="currentColor" fillOpacity={opacity}/>
    </svg>
  )
}

