export default function IconIn(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="1" y="1" width="20" height="20" rx="10" fill="#30D158"/>
      <rect x="1" y="1" width="20" height="20" rx="10" stroke="#0E0E0F" strokeWidth="2"/>
      <path d="M14 8L9 13" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.8 14H8.6C8.26863 14 8 13.7313 8 13.4V9.19995" stroke="black" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
