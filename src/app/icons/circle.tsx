export default function IconCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="10" cy="10" r="7" stroke="#EBEBF5" strokeOpacity="0.3" strokeWidth="2"/>
    </svg>
  )
}

export function IconCircleOn(props: React.SVGProps<SVGSVGElement>) {
  return (
     <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="10" cy="10" r="7" fill="#30D158" fillOpacity="0.08" stroke="#30D158" strokeWidth="2"/>
    </svg>
  )
}

