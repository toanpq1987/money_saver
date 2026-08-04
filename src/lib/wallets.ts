import type { Account, Profile } from './types'

/**
 * "Ví" trong app la mot TANG GOM, khong phai mot tai khoan don le.
 *
 *   Ví của chồng          <- nhom (WalletGroup)
 *     ├── Tiền mặt        <- tai khoan (Account)
 *     ├── Vietcombank
 *     └── Momo
 *   Ví của vợ
 *   Ví chung của gia đình
 *
 * Khoa gom chinh la accounts.owner_id da co san: cung mot chu thi cung mot vi,
 * owner_id rong thi thuoc vi chung cua nha. Nho vay khong can them bang moi.
 *
 * Han che can biet: cach nay cho dung 3 nhom (moi thanh vien mot nhom, cong
 * mot nhom chung). Muon dat them nhom tu do kieu "Quỹ du lịch" thi phai them
 * bang rieng - luc do se can mot migration.
 */
export interface WalletGroup {
  /** 'shared' cho vi chung, con lai la id cua thanh vien so huu. */
  key: string
  name: string
  emoji: string
  color: string
  ownerId: string | null
  accounts: Account[]
  accountIds: string[]
  /** True neu day la vi cua chinh nguoi dang dang nhap. */
  isMine: boolean
}

/**
 * Gom tai khoan thanh cac vi. Vi cua chinh minh xep dau tien, roi den vi cua
 * nguoi khac, cuoi cung la vi chung - de thu minh quan tam nhat nam tren cung.
 */
export function groupAccountsByOwner(
  accounts: Account[],
  members: Profile[],
  myId: string | undefined,
): WalletGroup[] {
  const live = accounts.filter((a) => !a.archived)

  const owned = members.map<WalletGroup>((m) => {
    const mine = live.filter((a) => a.owner_id === m.id)
    return {
      key: m.id,
      name: m.id === myId ? 'Ví của tôi' : `Ví của ${m.display_name}`,
      emoji: m.avatar_emoji,
      color: m.color,
      ownerId: m.id,
      accounts: mine,
      accountIds: mine.map((a) => a.id),
      isMine: m.id === myId,
    }
  })

  const sharedAccounts = live.filter((a) => !a.owner_id)
  const shared: WalletGroup = {
    key: 'shared',
    name: 'Ví chung của gia đình',
    emoji: '🏠',
    color: '#898781',
    ownerId: null,
    accounts: sharedAccounts,
    accountIds: sharedAccounts.map((a) => a.id),
    isMine: false,
  }

  return [...owned.filter((g) => g.isMine), ...owned.filter((g) => !g.isMine), shared].filter(
    (g) => g.accounts.length > 0,
  )
}

/** Nhan ngan gon cho mot tai khoan khi hien trong danh sach chung. */
export function walletLabel(group: WalletGroup, account: Account): string {
  return `${group.name} · ${account.name}`
}
