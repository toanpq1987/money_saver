import { useEffect, useState } from 'react'
import { DARK_TOKENS, LIGHT_TOKENS, type ChartTokens } from '@/lib/palette'

/**
 * Doc che do sang/toi dang hien tren <html> va tra ve bo mau tuong ung.
 * Che do toi co bo mau RIENG (khong phai dao mau tu che do sang) - mau da
 * duoc chon lai cho nen toi va kiem tra lai tu dau.
 */
export function useChartTokens(): ChartTokens {
  const read = () => (document.documentElement.classList.contains('dark') ? DARK_TOKENS : LIGHT_TOKENS)
  const [tokens, setTokens] = useState<ChartTokens>(read)

  useEffect(() => {
    const observer = new MutationObserver(() => setTokens(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return tokens
}
