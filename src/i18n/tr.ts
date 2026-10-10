/** Turkish UI catalog (default language). Components must read strings from here, never hardcode them. */
export const tr = {
  login: { button: "Google ile Giriş Yap" },
  accessDenied: {
    unverified_email: "Google hesabınızın e-posta adresi doğrulanmamış. Lütfen doğrulanmış bir hesapla tekrar deneyin.",
    not_invited: "Bu hesap için erişim yetkisi bulunmuyor. Erişim için yöneticiden davet isteyin.",
    sub_mismatch: "Bu davet başka bir Google hesabına bağlı. Doğru hesapla giriş yapın.",
    suspended: "Hesabınız askıya alındı. Lütfen yönetici ile iletişime geçin.",
    revoked: "Hesabınızın erişimi kaldırıldı. Lütfen yönetici ile iletişime geçin.",
    expired: "Hesabınızın erişim süresi doldu. Lütfen yönetici ile iletişime geçin.",
  },
  errors: {
    protected_account: "Bu hesap korumalıdır ve bu işlemle değiştirilemez.",
    self_modification: "Kendi hesabınızın yetkilerini veya kotasını değiştiremezsiniz.",
    permission_denied: "Bu işlem için yetkiniz yok.",
    super_admin_only: "Bu işlemi yalnızca süper yönetici yapabilir.",
    rank_not_assignable: "Bu rütbe atanamaz.",
    not_authenticated: "Oturumunuz geçersiz. Lütfen tekrar giriş yapın.",
    invalid_email: "Geçerli bir e-posta adresi girin.",
    invalid_token: "Google oturumu doğrulanamadı. Lütfen tekrar deneyin.",
    wrong_provider: "Yalnızca Google hesabıyla giriş yapılabilir.",
  },
  quota: { used: "Kullanılan kota", remaining: "Kalan kota", dailyLimit: "Günlük limit", unit: "birim" },
} as const;
