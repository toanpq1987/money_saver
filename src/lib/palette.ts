/**
 * Mau dung cho bieu do.
 *
 * Bo mau nay da duoc kiem tra bang cong cu validate (do sang, do bao hoa,
 * do phan biet voi nguoi mu mau protan/deutan/tritan, va do tuong phan voi nen)
 * o CA HAI che do sang & toi. Dung tu y doi hex neu chua chay lai kiem tra.
 *
 * Nguyen tac ap dung trong app nay:
 *  - Bieu do co dung 2 duong du lieu (Thu/Chi, Chong/Vo) -> dung mau phan loai.
 *  - Bang xep hang danh muc -> KHONG dung mau de phan biet danh muc (12 danh muc
 *    thi khong bo mau nao an toan duoc). Danh tinh den tu icon + ten ghi thang
 *    tren tung dong; mau chi con nhiem vu the hien do lon.
 */

export interface ChartTokens {
  income: string
  expense: string
  /** Mau phan loai cho tung thanh vien khi ho chua tu chon mau. */
  memberFallback: [string, string]
  /** Mot sac do dam dan theo do lon - dung cho bang xep hang danh muc. */
  magnitude: (t: number) => string
  grid: string
  axis: string
  muted: string
  surface: string
  tooltipBg: string
  tooltipText: string
}

const LIGHT_RAMP = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#256abf', '#184f95']
const DARK_RAMP = ['#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#86b6ef']

function ramp(steps: string[]) {
  return (t: number) => {
    const i = Math.round(Math.max(0, Math.min(1, t)) * (steps.length - 1))
    return steps[i]
  }
}

export const LIGHT_TOKENS: ChartTokens = {
  income: '#2a78d6',
  expense: '#e34948',
  memberFallback: ['#2a78d6', '#e87ba4'],
  magnitude: ramp(LIGHT_RAMP),
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  surface: '#ffffff',
  tooltipBg: '#0b0b0b',
  tooltipText: '#ffffff',
}

export const DARK_TOKENS: ChartTokens = {
  income: '#3987e5',
  expense: '#e66767',
  memberFallback: ['#3987e5', '#d55181'],
  magnitude: ramp(DARK_RAMP),
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#898781',
  surface: '#1a1a19',
  tooltipBg: '#ffffff',
  tooltipText: '#0b0b0b',
}
