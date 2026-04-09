// src/lib/i18n/tr.ts
export const tr = {
  // Navigation
  nav: {
    search: 'Ara',
    cart: 'Sepet',
    login: 'Giriş Yap',
    account: 'Hesabım',
    logout: 'Çıkış Yap',
    admin: 'Yönetim Paneli'
  },
  // Landing
  hero: {
    searchPlaceholder: 'Ürün, marka veya araç ara...',
    searchButton: 'Ara'
  },
  trustBadges: {
    securePayment: 'Güvenli Ödeme',
    fastShipping: 'Hızlı Kargo',
    originalParts: 'Orijinal Parça',
    easyReturns: 'Kolay İade'
  },
  // Product listing
  listing: {
    filters: 'Filtreler',
    sort: 'Sıralama',
    sortNewest: 'En Yeni',
    sortPriceAsc: 'Fiyat (Artan)',
    sortPriceDesc: 'Fiyat (Azalan)',
    sortBestSelling: 'En Çok Satan',
    make: 'Marka',
    model: 'Model',
    year: 'Yıl',
    category: 'Kategori',
    brand: 'Marka',
    priceRange: 'Fiyat Aralığı',
    inStockOnly: 'Sadece Stokta',
    addToCart: 'Sepete Ekle',
    noResults: 'Ürün bulunamadı.',
    searchUnavailable: 'Arama servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.'
  },
  // Product detail
  product: {
    inStock: 'Stokta Var',
    lowStock: 'Son Birkaç Ürün',
    outOfStock: 'Stokta Yok',
    quantity: 'Adet',
    addToCart: 'Sepete Ekle',
    sku: 'Parça No',
    brand: 'Marka',
    compatibleVehicles: 'Uyumlu Araçlar',
    relatedProducts: 'Benzer Ürünler',
    description: 'Açıklama',
    installments: 'Taksit Seçenekleri'
  },
  // Cart
  cart: {
    title: 'Alışveriş Sepeti',
    empty: 'Sepetiniz boş.',
    total: 'Toplam',
    checkout: 'Ödemeye Geç',
    remove: 'Kaldır',
    continueShopping: 'Alışverişe Devam Et'
  },
  // Checkout
  checkout: {
    title: 'Ödeme',
    stepDelivery: 'Teslimat Adresi',
    stepPayment: 'Kart Bilgileri',
    stepReview: 'Sipariş Özeti',
    fullName: 'Ad Soyad',
    phone: 'Telefon',
    address: 'Adres',
    district: 'İlçe',
    city: 'Şehir',
    zipCode: 'Posta Kodu',
    cardNumber: 'Kart Numarası',
    cardHolder: 'Kart Üzerindeki İsim',
    expiryDate: 'Son Kullanma Tarihi',
    cvv: 'CVV',
    installment: 'Taksit',
    singlePayment: 'Tek Çekim',
    submit: 'Ödemeyi Tamamla',
    paymentError: 'Ödeme işlemi başarısız. Lütfen tekrar deneyin.',
    stockError: 'Üzgünüz, bir veya daha fazla ürün stoktan tükendi.'
  },
  // Payment result
  payment: {
    successTitle: 'Ödeme Başarılı',
    successMessage: 'Siparişiniz alındı. Teşekkürler!',
    failureTitle: 'Ödeme Başarısız',
    failureMessage: 'Ödeme işlemi tamamlanamadı. Tekrar deneyebilirsiniz.',
    viewOrders: 'Siparişlerimi Gör'
  },
  // Auth
  auth: {
    loginTitle: 'Giriş Yap',
    registerTitle: 'Kayıt Ol',
    email: 'E-posta',
    password: 'Şifre',
    name: 'Ad Soyad',
    loginButton: 'Giriş Yap',
    registerButton: 'Kayıt Ol',
    noAccount: 'Hesabınız yok mu?',
    hasAccount: 'Zaten hesabınız var mı?',
    invalidCredentials: 'E-posta veya şifre hatalı.',
    emailTaken: 'Bu e-posta adresi zaten kayıtlı.'
  },
  // Account
  account: {
    title: 'Hesabım',
    orders: 'Siparişlerim',
    orderDate: 'Tarih',
    orderStatus: 'Durum',
    orderTotal: 'Toplam',
    noOrders: 'Henüz siparişiniz bulunmuyor.'
  },
  // Order statuses
  orderStatus: {
    BEKLEMEDE: 'Beklemede',
    ODEME_BEKLENIYOR: 'Ödeme Bekleniyor',
    ODEME_ALINDI: 'Ödeme Alındı',
    HAZIRLANIYOR: 'Hazırlanıyor',
    KARGOLANDI: 'Kargolandı',
    TESLIM_EDILDI: 'Teslim Edildi',
    IPTAL: 'İptal',
    IADE: 'İade'
  },
  // Admin
  admin: {
    dashboard: 'Gösterge Paneli',
    products: 'Ürünler',
    orders: 'Siparişler',
    categories: 'Kategoriler',
    settings: 'Ayarlar',
    revenueToday: 'Bugünkü Gelir',
    revenueMonth: 'Bu Ayki Gelir',
    lowStock: 'Düşük Stok',
    newProduct: 'Yeni Ürün',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    active: 'Aktif',
    featured: 'Öne Çıkan',
    import: 'CSV İçe Aktar',
    markShipped: 'Kargolandı Olarak İşaretle',
    cancelOrder: 'Siparişi İptal Et',
    refund: 'İade Et'
  },
  // Errors
  errors: {
    notFound: 'Sayfa bulunamadı.',
    serverError: 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
    forbidden: 'Bu sayfaya erişim yetkiniz yok.'
  }
} as const;
