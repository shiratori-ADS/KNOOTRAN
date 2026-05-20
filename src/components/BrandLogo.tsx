import knootranLogo from '../assets/knootran_logo.png'

type BrandLogoProps = {
  variant?: 'header' | 'login'
}

export function BrandLogo({ variant = 'header' }: BrandLogoProps) {
  const className = variant === 'login' ? 'brandLogo brandLogoLogin' : 'brandLogo'
  return <img src={knootranLogo} alt="KNOOTRAN" className={className} width={320} height={80} />
}
