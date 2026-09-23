export type Language = 'id' | 'en';

export interface Translations {
  nav: {
    overview: string;
    analytics: string;
    inventory: string;
    procurement: string;
    finance: string;
    hr: string;
    billing: string;
    settings: string;
    newPo: string;
    activeSession: string;
    logout: string;
  };
  headers: {
    overview: string;
    analytics: string;
    inventory: string;
    procurement: string;
    finance: string;
    hr: string;
    billing: string;
    newPo: string;
    settings: string;
  };
  common: {
    search: string;
    save: string;
    cancel: string;
    close: string;
    saving: string;
    success: string;
    error: string;
    actions: string;
    status: string;
    total: string;
    date: string;
    details: string;
    downloadCsv: string;
    filter: string;
    viewAll: string;
    language: string;
    languageDescription: string;
    english: string;
    indonesian: string;
    role: string;
    selectLanguage: string;
    langChanged: string;
    export: string;
    showingPage: string;
    of: string;
    noResults: string;
    print: string;
    copy: string;
    copied: string;
  };
  overview: {
    totalRevenue: string;
    activePos: string;
    lowStockAlerts: string;
    employeeHeadcount: string;
    quickActions: string;
    activityStream: string;
    createPo: string;
    generateInvoice: string;
    onboardEmployee: string;
    viewAnalytics: string;
    pendingApprovals: string;
    belowSafety: string;
    newThisMonth: string;
    vsLastMonth: string;
  };
  settings: {
    title: string;
    profileTab: string;
    workspaceTab: string;
    languageTab: string;
    billingTab: string;
    profileTitle: string;
    workspaceTitle: string;
    languageTitle: string;
    billingTitle: string;
    fullName: string;
    emailAddress: string;
    changeAvatar: string;
    avatarHint: string;
    saveChanges: string;
    emailOnPo: string;
    weeklySummary: string;
    updatePreferences: string;
    activePlan: string;
    planDesc: string;
    manageStripe: string;
    systemLanguage: string;
    systemLanguageHint: string;
    currentLanguageBadge: string;
  };
  procurement: {
    title: string;
    subtitle: string;
    createPoBtn: string;
    exportCsv: string;
    totalCommitted: string;
    activeVendors: string;
    awaitingReview: string;
    listView: string;
    kanbanView: string;
    transactionView: string;
    tableTitle: string;
    searchPlaceholder: string;
    poNumber: string;
    vendor: string;
    category: string;
    date: string;
    amount: string;
    status: string;
    actions: string;
    reviewBtn: string;
    detailBtn: string;
    payGatewayBtn: string;
    paidStatus: string;
    pendingApproval: string;
    approved: string;
    completed: string;
    rejected: string;
    totalPaidFunds: string;
    paymentChannels: string;
    gatewayStatus: string;
    gatewayOnline: string;
    verifiedTxs: string;
    auditTableTitle: string;
    settlementTime: string;
    receiptCol: string;
    noTransactions: string;
    reviewModalTitle: string;
    detailModalTitle: string;
    approveBtn: string;
    rejectBtn: string;
    openGatewayBtn: string;
    paidViaGatewayBanner: string;
  };
  gateway: {
    modalTitle: string;
    secureSubtitle: string;
    invoiceTitle: string;
    summaryTitle: string;
    baseSubtotal: string;
    vatTax: string;
    grandTotal: string;
    selectChannel: string;
    vaTab: string;
    cardTab: string;
    wireTab: string;
    qrisTab: string;
    vaNumberLabel: string;
    cardNumLabel: string;
    cardExpiryLabel: string;
    cardCvvLabel: string;
    cardHolderLabel: string;
    wireSourceLabel: string;
    wireNotesLabel: string;
    qrisScanPrompt: string;
    qrisSupported: string;
    simulateBtn: string;
    stepEncrypting: string;
    stepVerifying: string;
    stepSettling: string;
    successTitle: string;
    successMessage: string;
    voucherTitle: string;
    txIdLabel: string;
    receiptLabel: string;
    timestampLabel: string;
    printBtn: string;
    closeBtn: string;
    recipientAccount: string;
    accountHolder: string;
  };
  notifications: {
    centerTitle: string;
    newBadge: string;
    markAllRead: string;
    clearAll: string;
    allTab: string;
    txTab: string;
    justNow: string;
    minsAgo: string;
    hoursAgo: string;
    emptyText: string;
    clickToOpenPo: string;
    initGatewayTitle: string;
    initGatewayMsg: string;
    initStockTitle: string;
    initStockMsg: string;
    paymentSuccessTitle: string;
    paymentSuccessMsg: string;
    allMarkedRead: string;
    allCleared: string;
  };
  inventory: {
    totalUnits: string;
    fromLastMonth: string;
    assetValuation: string;
    valuationHint: string;
    outboundRequests: string;
    processedToday: string;
    statusOptimal: string;
    statusOptimalDesc: string;
    generateReport: string;
    tableTitle: string;
    searchPlaceholder: string;
    skuCol: string;
    deviceNameCol: string;
    stockCol: string;
    conditionCol: string;
    quickActionCol: string;
    deployBtn: string;
    noItems: string;
    reportSuccess: string;
    deploySuccess: string;
  };
  finance: {
    totalRevenueMonth: string;
    targetOverachieved: string;
    outstandingInvoices: string;
    overdueInvoices: string;
    cashEquivalents: string;
    liquiditySafe: string;
    tableTitle: string;
    searchPlaceholder: string;
    invNumberCol: string;
    clientCol: string;
    dueDateCol: string;
    amountCol: string;
    statusCol: string;
    actionCol: string;
    receiptBtn: string;
    sendWarningBtn: string;
    noInvoices: string;
    warningSent: string;
    paidBadge: string;
    overdueBadge: string;
    pendingBadge: string;
  };
  hr: {
    totalEmployees: string;
    newHiresMonth: string;
    payrollEstimate: string;
    disbursementDate: string;
    pendingLeaves: string;
    waitingManager: string;
    tableTitle: string;
    searchPlaceholder: string;
    empIdCol: string;
    empNameCol: string;
    deptCol: string;
    roleCol: string;
    statusCol: string;
    actionCol: string;
    scheduleOnboardBtn: string;
    profileBtn: string;
    noEmployees: string;
    managePayrollBtn: string;
  };
  purchase: {
    title: string;
    formTitle: string;
    formDesc: string;
    vendorLabel: string;
    selectVendor: string;
    skuLabel: string;
    qtyLabel: string;
    priceLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    cancelBtn: string;
    submitBtn: string;
    processing: string;
    confirmedTitle: string;
    confirmedDesc: string;
    returnBtn: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    exportReport: string;
    aiTitle: string;
    aiSubtitle: string;
    aiPlaceholder: string;
    askAiBtn: string;
    analyzingBtn: string;
    analysisResult: string;
    prompt1: string;
    prompt2: string;
    prompt3: string;
    deptBudgetAllocation: string;
    topVendors: string;
    cashFlowForecast: string;
  };
}

export const translations: Record<Language, Translations> = {
  id: {
    nav: {
      overview: 'Overview',
      analytics: 'Analytics',
      inventory: 'Manajemen Stok',
      procurement: 'Pengadaan (PO)',
      finance: 'Keuangan & Invoice',
      hr: 'SDM & Payroll',
      billing: 'Langganan & Billing',
      settings: 'Pengaturan',
      newPo: 'Buat PO Baru',
      activeSession: 'Sesi Aktif',
      logout: 'Keluar'
    },
    headers: {
      overview: 'Command Center Overview',
      analytics: 'Analytics & Reporting',
      inventory: 'Pusat Kendali Inventaris',
      procurement: 'Manajemen Pengadaan (PO)',
      finance: 'Keuangan & Invoice',
      hr: 'Sumber Daya Manusia (SDM)',
      billing: 'Langganan & Billing Cloud',
      newPo: 'Buat Purchase Order Baru',
      settings: 'Pengaturan Workspace'
    },
    common: {
      search: 'Cari...',
      save: 'Simpan',
      cancel: 'Batal',
      close: 'Tutup',
      saving: 'Menyimpan...',
      success: 'Berhasil',
      error: 'Terjadi Kesalahan',
      actions: 'Aksi',
      status: 'Status',
      total: 'Total',
      date: 'Tanggal',
      details: 'Detail',
      downloadCsv: 'Unduh CSV',
      filter: 'Filter',
      viewAll: 'Lihat Semua',
      language: 'Bahasa',
      languageDescription: 'Pilih bahasa tampilan untuk workspace Inventora Anda.',
      english: 'English (US)',
      indonesian: 'Bahasa Indonesia',
      role: 'Peran',
      selectLanguage: 'Ganti Bahasa',
      langChanged: 'Bahasa berhasil diubah ke Bahasa Indonesia',
      export: 'Ekspor',
      showingPage: 'Menampilkan halaman',
      of: 'dari',
      noResults: 'Tidak ada hasil yang ditemukan.',
      print: 'Cetak',
      copy: 'Salin',
      copied: 'Disalin!'
    },
    overview: {
      totalRevenue: 'Total Pendapatan',
      activePos: 'PO Aktif',
      lowStockAlerts: 'Peringatan Stok Rendah',
      employeeHeadcount: 'Jumlah Karyawan',
      quickActions: 'Aksi Cepat',
      activityStream: 'Aktivitas Terbaru',
      createPo: 'Buat PO Baru',
      generateInvoice: 'Buat Invoice',
      onboardEmployee: 'Onboard Pegawai',
      viewAnalytics: 'Buka Analytics Penuh',
      pendingApprovals: 'menunggu persetujuan',
      belowSafety: 'Item di bawah ambang aman',
      newThisMonth: 'pegawai baru bulan ini',
      vsLastMonth: 'dibandingkan bulan lalu'
    },
    settings: {
      title: 'Pengaturan',
      profileTab: 'Profil & Akun',
      workspaceTab: 'Preferensi Workspace',
      languageTab: 'Bahasa & Wilayah',
      billingTab: 'Tagihan & Paket',
      profileTitle: 'Pengaturan Profil',
      workspaceTitle: 'Konfigurasi Workspace',
      languageTitle: 'Preferensi Bahasa & Regional',
      billingTitle: 'Ringkasan Paket & Tagihan',
      fullName: 'Nama Lengkap',
      emailAddress: 'Alamat Email',
      changeAvatar: 'Ganti Foto',
      avatarHint: 'JPG, GIF atau PNG. Ukuran maksimal 800KB',
      saveChanges: 'Simpan Perubahan',
      emailOnPo: 'Kirim notifikasi email saat ada PO baru',
      weeklySummary: 'Kirim ringkasan inventaris mingguan',
      updatePreferences: 'Perbarui Preferensi',
      activePlan: 'Paket Enterprise',
      planDesc: 'Akses tanpa batas, audit keamanan 256-bit, integrasi payment gateway.',
      manageStripe: 'Kelola Langganan via Stripe',
      systemLanguage: 'Bahasa Sistem',
      systemLanguageHint: 'Pilih bahasa antarmuka pengguna Inventora ERP.',
      currentLanguageBadge: 'Sedang Digunakan'
    },
    procurement: {
      title: 'Manajemen Pengadaan (PO)',
      subtitle: 'Pantau pengadaan perangkat, siklus persetujuan, dan settlement payment gateway.',
      createPoBtn: 'Buat Purchase Order Baru',
      exportCsv: 'Ekspor Data CSV',
      totalCommitted: 'Total Nilai PO Terkomitmen',
      activeVendors: 'Vendor Pengadaan Aktif',
      awaitingReview: 'Menunggu Persetujuan',
      listView: 'Tampilan Tabel',
      kanbanView: 'Papan Kanban',
      transactionView: 'Riwayat Gateway',
      tableTitle: 'Daftar Purchase Order (PO)',
      searchPlaceholder: 'Cari No PO atau Vendor...',
      poNumber: 'No. PO',
      vendor: 'Vendor Supplier',
      category: 'Kategori / Keterangan',
      date: 'Tanggal Pengajuan',
      amount: 'Total (Rp)',
      status: 'Status',
      actions: 'Aksi & Gateway',
      reviewBtn: 'Review',
      detailBtn: 'Detail',
      payGatewayBtn: 'Bayar via Gateway',
      paidStatus: 'Lunas',
      pendingApproval: 'Menunggu Persetujuan',
      approved: 'Disetujui',
      completed: 'Selesai',
      rejected: 'Ditolak',
      totalPaidFunds: 'Total Dana Terbayar',
      paymentChannels: 'Saluran Pembayaran',
      gatewayStatus: 'Status Gateway',
      gatewayOnline: 'ONLINE & TERENKRIPSI',
      verifiedTxs: 'Transaksi Berhasil Diverifikasi',
      auditTableTitle: 'Riwayat Audit & Settlement Pembayaran PO',
      settlementTime: 'Waktu Settlement',
      receiptCol: 'No. Bukti / Receipt',
      noTransactions: 'Belum ada transaksi pembayaran yang diselesaikan.',
      reviewModalTitle: 'Review Purchase Order',
      detailModalTitle: 'Detail Purchase Order',
      approveBtn: 'Setujui PO',
      rejectBtn: 'Tolak PO',
      openGatewayBtn: 'Buka Payment Gateway',
      paidViaGatewayBanner: 'PO ini telah diselesaikan via Payment Gateway'
    },
    gateway: {
      modalTitle: 'Inventora Corporate Gateway',
      secureSubtitle: 'Jalur Settlement Terenkripsi 256-Bit',
      invoiceTitle: 'Tagihan Pengadaan (PO)',
      summaryTitle: 'Ringkasan Tagihan & PPN (11%)',
      baseSubtotal: 'Subtotal Tagihan Pokok',
      vatTax: 'PPN (11%) Ditanggung Perusahaan',
      grandTotal: 'Total Tagihan Terbayar',
      selectChannel: 'Pilih Saluran Pembayaran',
      vaTab: 'Virtual Account',
      cardTab: 'Kartu Korporat',
      wireTab: 'Corporate Wire / RTGS',
      qrisTab: 'B2B QRIS Dinamis',
      vaNumberLabel: 'Nomor Virtual Account (Dedicated)',
      cardNumLabel: 'Nomor Kartu Korporat',
      cardExpiryLabel: 'Kadaluarsa',
      cardCvvLabel: 'CVV',
      cardHolderLabel: 'Nama Pemegang Kartu',
      wireSourceLabel: 'Rekening Sumber Treasury',
      wireNotesLabel: 'Catatan / Berita Transfer',
      qrisScanPrompt: 'Pindai dengan Mobile Banking atau Corporate QR Scanner',
      qrisSupported: 'Settlement instan terverifikasi oleh BI-FAST / ASPI.',
      simulateBtn: 'Simulasi Bayar Sekarang',
      stepEncrypting: 'Memproses Enkripsi & Tokenisasi Transaksi...',
      stepVerifying: 'Memverifikasi Settlement Antar Bank...',
      stepSettling: 'Sinkronisasi Buku Kas & Rekonsiliasi Otomatis...',
      successTitle: 'Pembayaran Berhasil & Terverifikasi!',
      successMessage: 'Pembayaran telah diterima dan settled secara instan ke rekening vendor.',
      voucherTitle: 'Voucher Settlement & Audit Trail Resmi',
      txIdLabel: 'ID Transaksi Gateway',
      receiptLabel: 'Nomor Resi / Receipt',
      timestampLabel: 'Waktu Settlement',
      printBtn: 'Cetak Bukti Pembayaran',
      closeBtn: 'Selesai & Tutup',
      recipientAccount: 'Rekening Tujuan Penerima',
      accountHolder: 'Pemegang Rekening'
    },
    notifications: {
      centerTitle: 'Pusat Notifikasi',
      newBadge: 'baru',
      markAllRead: 'Tandai semua dibaca',
      clearAll: 'Hapus semua',
      allTab: 'Semua',
      txTab: 'Transaksi',
      justNow: 'Baru saja',
      minsAgo: 'm yang lalu',
      hoursAgo: 'j yang lalu',
      emptyText: 'Belum ada notifikasi baru.',
      clickToOpenPo: 'Klik untuk membuka PO terkait',
      initGatewayTitle: 'Payment Gateway Pengadaan Aktif',
      initGatewayMsg: 'Kanal Virtual Account, Corporate Card, RTGS, dan QRIS siap memproses settlement otomatis.',
      initStockTitle: 'Peringatan Stok Kritis',
      initStockMsg: 'STR-NVME-8TB tersisa 3 unit (di bawah ambang batas aman 10 unit).',
      paymentSuccessTitle: 'Transaksi Pembayaran PO Berhasil',
      paymentSuccessMsg: 'Pembayaran {poId} ke {vendor} senilai {amount} via {method} telah berhasil diverifikasi. Status PO: Selesai.',
      allMarkedRead: 'Semua notifikasi ditandai sudah dibaca',
      allCleared: 'Semua notifikasi dibersihkan'
    },
    inventory: {
      totalUnits: 'Total Unit Infrastruktur',
      fromLastMonth: 'dari bulan lalu',
      assetValuation: 'Valuasi Aset Terintegrasi',
      valuationHint: 'Estimasi Kurs: Rp 15,000/Unit',
      outboundRequests: 'Permintaan Outbound Aktif',
      processedToday: 'Diproses hari ini',
      statusOptimal: 'Status Ketersediaan: Optimal',
      statusOptimalDesc: 'Seluruh unit infrastruktur kritis berada di atas ambang batas minimum keamanan.',
      generateReport: 'Generate Report',
      tableTitle: 'Distribusi Hardware Komputasi',
      searchPlaceholder: 'Cari SKU atau Nama Perangkat...',
      skuCol: 'SKU',
      deviceNameCol: 'Nama Perangkat',
      stockCol: 'Stok Saat Ini',
      conditionCol: 'Kondisi',
      quickActionCol: 'Aksi Cepat',
      deployBtn: 'Deploy 1 Unit',
      noItems: 'Tidak ada data perangkat yang cocok.',
      reportSuccess: 'Laporan inventaris berhasil di-generate',
      deploySuccess: '1 unit berhasil di-deploy'
    },
    finance: {
      totalRevenueMonth: 'Total Pendapatan (Bulan Ini)',
      targetOverachieved: 'dari target bulanan',
      outstandingInvoices: 'Outstanding Invoices',
      overdueInvoices: 'Invoice melewati jatuh tempo',
      cashEquivalents: 'Kas & Setara Kas',
      liquiditySafe: 'Posisi Likuiditas Sehat & Terkendali',
      tableTitle: 'Buku Besar & Tagihan Aktif',
      searchPlaceholder: 'Cari No Tagihan atau Klien...',
      invNumberCol: 'No. Invoice',
      clientCol: 'Klien / Mitra',
      dueDateCol: 'Jatuh Tempo',
      amountCol: 'Nominal (Rp)',
      statusCol: 'Status',
      actionCol: 'Aksi',
      receiptBtn: 'Receipt',
      sendWarningBtn: 'Kirim Peringatan',
      noInvoices: 'Tidak ada invoice yang cocok.',
      warningSent: 'Email peringatan otomatis telah dikirim ke klien',
      paidBadge: 'Lunas',
      overdueBadge: 'Overdue',
      pendingBadge: 'Pending'
    },
    hr: {
      totalEmployees: 'Total Pegawai Aktif',
      newHiresMonth: 'Rekrutmen Bulan Ini',
      payrollEstimate: 'Estimasi Payroll Bulanan',
      disbursementDate: 'Jadwal Pencairan: Tanggal 25',
      pendingLeaves: 'Cuti Pending',
      waitingManager: 'Menunggu Persetujuan Manajer',
      tableTitle: 'Direktori SDM & Payroll',
      searchPlaceholder: 'Cari Nama Pegawai atau ID...',
      empIdCol: 'ID Pegawai',
      empNameCol: 'Nama Pegawai',
      deptCol: 'Departemen',
      roleCol: 'Posisi',
      statusCol: 'Status',
      actionCol: 'Aksi',
      scheduleOnboardBtn: 'Jadwal Onboarding',
      profileBtn: 'Profil',
      noEmployees: 'Tidak ada pegawai yang ditemukan.',
      managePayrollBtn: 'Kelola Payroll'
    },
    purchase: {
      title: 'Buat Purchase Order Baru',
      formTitle: 'Formulir Pengadaan',
      formDesc: 'Masukkan detail unit yang akan dipesan melalui vendor terdaftar.',
      vendorLabel: 'Vendor Supplier',
      selectVendor: 'Pilih Vendor...',
      skuLabel: 'SKU / Nama Perangkat',
      qtyLabel: 'Kuantitas (Unit)',
      priceLabel: 'Total Estimasi Harga (Rp)',
      notesLabel: 'Catatan / Urgensi',
      notesPlaceholder: 'Tambahkan catatan jika diperlukan...',
      cancelBtn: 'Batal',
      submitBtn: 'Submit Order',
      processing: 'Memproses...',
      confirmedTitle: 'Pesanan Dikonfirmasi',
      confirmedDesc: 'telah dibuat dan dikirimkan untuk proses persetujuan.',
      returnBtn: 'Kembali ke Pengadaan'
    },
    analytics: {
      title: 'Analytics & Pelaporan',
      subtitle: 'Wawasan multi-dimensi di seluruh data operasional perusahaan Anda.',
      exportReport: 'Ekspor Laporan',
      aiTitle: 'Analis Data AI Inventora',
      aiSubtitle: 'Tanyakan pertanyaan analitis tentang anggaran, konsentrasi vendor, dan proyeksi arus kas.',
      aiPlaceholder: 'Contoh: Berapa persentase anggaran yang dipegang Teknik dan bagaimana perbandingannya dengan pemasaran?',
      askAiBtn: 'Tanya AI',
      analyzingBtn: 'Menganalisis...',
      analysisResult: 'Hasil Analisis',
      prompt1: 'Ringkas kesehatan anggaran & arus kas',
      prompt2: 'Analisis risiko konsentrasi vendor',
      prompt3: 'Rekomendasikan efisiensi biaya',
      deptBudgetAllocation: 'Alokasi Anggaran Departemen',
      topVendors: 'Vendor Teratas Berdasarkan Volume',
      cashFlowForecast: 'Prakiraan Arus Kas'
    }
  },
  en: {
    nav: {
      overview: 'Overview',
      analytics: 'Analytics',
      inventory: 'Inventory Stock',
      procurement: 'Procurement (PO)',
      finance: 'Finance & Invoices',
      hr: 'HR & Payroll',
      billing: 'Billing & Plans',
      settings: 'Settings',
      newPo: 'Create New PO',
      activeSession: 'Active Session',
      logout: 'Logout'
    },
    headers: {
      overview: 'Command Center Overview',
      analytics: 'Analytics & Reporting',
      inventory: 'Inventory Control Center',
      procurement: 'Procurement Management (PO)',
      finance: 'Finance & Invoices',
      hr: 'Human Resources (HR)',
      billing: 'Billing & Cloud Subscription',
      newPo: 'Create Purchase Order',
      settings: 'Workspace Settings'
    },
    common: {
      search: 'Search...',
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      saving: 'Saving...',
      success: 'Success',
      error: 'An error occurred',
      actions: 'Actions',
      status: 'Status',
      total: 'Total',
      date: 'Date',
      details: 'Details',
      downloadCsv: 'Download CSV',
      filter: 'Filter',
      viewAll: 'View All',
      language: 'Language',
      languageDescription: 'Select your preferred display language for the Inventora workspace.',
      english: 'English (US)',
      indonesian: 'Bahasa Indonesia',
      role: 'Role',
      selectLanguage: 'Change Language',
      langChanged: 'Language changed to English successfully',
      export: 'Export',
      showingPage: 'Showing page',
      of: 'of',
      noResults: 'No matching results found.',
      print: 'Print',
      copy: 'Copy',
      copied: 'Copied!'
    },
    overview: {
      totalRevenue: 'Total Revenue',
      activePos: 'Active POs',
      lowStockAlerts: 'Low Stock Alerts',
      employeeHeadcount: 'Employee Headcount',
      quickActions: 'Quick Actions',
      activityStream: 'Activity Stream',
      createPo: 'Create New PO',
      generateInvoice: 'Generate Invoice',
      onboardEmployee: 'Onboard Employee',
      viewAnalytics: 'View Full Analytics',
      pendingApprovals: 'pending approvals',
      belowSafety: 'Items below safety threshold',
      newThisMonth: 'new hires this month',
      vsLastMonth: 'vs last month'
    },
    settings: {
      title: 'Settings',
      profileTab: 'Profile & Account',
      workspaceTab: 'Workspace Preferences',
      languageTab: 'Language & Region',
      billingTab: 'Billing & Plans',
      profileTitle: 'Profile Settings',
      workspaceTitle: 'Workspace Configuration',
      languageTitle: 'Language & Regional Preferences',
      billingTitle: 'Billing & Subscription',
      fullName: 'Full Name',
      emailAddress: 'Email Address',
      changeAvatar: 'Change Avatar',
      avatarHint: 'JPG, GIF or PNG. Max size 800KB',
      saveChanges: 'Save Changes',
      emailOnPo: 'Email me when a new PO is created',
      weeklySummary: 'Send weekly inventory summary reports',
      updatePreferences: 'Update Preferences',
      activePlan: 'Enterprise Plan',
      planDesc: 'Unlimited users, 256-bit security audits, integrated payment gateways.',
      manageStripe: 'Manage Subscription via Stripe',
      systemLanguage: 'System Language',
      systemLanguageHint: 'Choose the interface language for Inventora ERP.',
      currentLanguageBadge: 'Active'
    },
    procurement: {
      title: 'Procurement Management (PO)',
      subtitle: 'Monitor hardware orders, approval lifecycles, and automated gateway settlement.',
      createPoBtn: 'Create Purchase Order',
      exportCsv: 'Export CSV Data',
      totalCommitted: 'Total Committed PO Value',
      activeVendors: 'Active Suppliers',
      awaitingReview: 'Pending Approval',
      listView: 'List View',
      kanbanView: 'Kanban Board',
      transactionView: 'Gateway Transactions',
      tableTitle: 'Purchase Order (PO) Registry',
      searchPlaceholder: 'Search PO Number or Vendor...',
      poNumber: 'PO Number',
      vendor: 'Supplier / Vendor',
      category: 'Category / Purpose',
      date: 'Submission Date',
      amount: 'Total Amount',
      status: 'Status',
      actions: 'Actions & Gateway',
      reviewBtn: 'Review',
      detailBtn: 'Details',
      payGatewayBtn: 'Pay with Gateway',
      paidStatus: 'Settled',
      pendingApproval: 'Pending Approval',
      approved: 'Approved',
      completed: 'Completed',
      rejected: 'Rejected',
      totalPaidFunds: 'Total Disbursed Funds',
      paymentChannels: 'Payment Channels',
      gatewayStatus: 'Gateway Status',
      gatewayOnline: 'ONLINE & ENCRYPTED',
      verifiedTxs: 'Transactions Successfully Verified',
      auditTableTitle: 'Payment Audit & Gateway Settlement Ledger',
      settlementTime: 'Settlement Time',
      receiptCol: 'Receipt / Voucher #',
      noTransactions: 'No payment transactions settled yet.',
      reviewModalTitle: 'Review Purchase Order',
      detailModalTitle: 'Purchase Order Details',
      approveBtn: 'Approve PO',
      rejectBtn: 'Reject PO',
      openGatewayBtn: 'Open Payment Gateway',
      paidViaGatewayBanner: 'This PO has been settled via Payment Gateway'
    },
    gateway: {
      modalTitle: 'Inventora Corporate Gateway',
      secureSubtitle: '256-Bit Encrypted Settlement Channel',
      invoiceTitle: 'Purchase Order (PO) Invoice',
      summaryTitle: 'Billing Summary & VAT (11%)',
      baseSubtotal: 'Base Subtotal',
      vatTax: 'Corporate VAT (11%) Included',
      grandTotal: 'Grand Total Payable',
      selectChannel: 'Select Payment Channel',
      vaTab: 'Virtual Account',
      cardTab: 'Corporate Card',
      wireTab: 'Corporate Wire / RTGS',
      qrisTab: 'Dynamic B2B QRIS',
      vaNumberLabel: 'Dedicated Virtual Account Number',
      cardNumLabel: 'Corporate Card Number',
      cardExpiryLabel: 'Expiry',
      cardCvvLabel: 'CVV',
      cardHolderLabel: 'Cardholder Name',
      wireSourceLabel: 'Treasury Source Account',
      wireNotesLabel: 'Settlement Purpose / Notes',
      qrisScanPrompt: 'Scan with Mobile Banking or Corporate QR Scanner',
      qrisSupported: 'Instant settlement supported by BI-FAST / ASPI.',
      simulateBtn: 'Simulate Pay Now',
      stepEncrypting: 'Processing Transaction Encryption & Token...',
      stepVerifying: 'Verifying Interbank Clearing & Settlement...',
      stepSettling: 'Reconciling Ledger & Updating PO Status...',
      successTitle: 'Payment Successful & Verified!',
      successMessage: 'Payment has been received and settled instantly into supplier account.',
      voucherTitle: 'Official Settlement Voucher & Audit Trail',
      txIdLabel: 'Gateway Transaction ID',
      receiptLabel: 'Receipt / Voucher Number',
      timestampLabel: 'Settlement Timestamp',
      printBtn: 'Print Receipt / Voucher',
      closeBtn: 'Done & Close',
      recipientAccount: 'Destination Account',
      accountHolder: 'Account Holder'
    },
    notifications: {
      centerTitle: 'Notification Center',
      newBadge: 'new',
      markAllRead: 'Mark all as read',
      clearAll: 'Clear all',
      allTab: 'All',
      txTab: 'Transactions',
      justNow: 'Just now',
      minsAgo: 'm ago',
      hoursAgo: 'h ago',
      emptyText: 'No new notifications right now.',
      clickToOpenPo: 'Click to open related PO',
      initGatewayTitle: 'Procurement Payment Gateway Active',
      initGatewayMsg: 'Virtual Account, Corporate Card, RTGS, and QRIS channels are ready to process automated settlements.',
      initStockTitle: 'Critical Stock Alert',
      initStockMsg: 'STR-NVME-8TB has 3 units remaining (below safety threshold of 10 units).',
      paymentSuccessTitle: 'PO Payment Transaction Successful',
      paymentSuccessMsg: 'Payment for {poId} to {vendor} totaling {amount} via {method} has been verified successfully. PO Status: Completed.',
      allMarkedRead: 'All notifications marked as read',
      allCleared: 'All notifications cleared'
    },
    inventory: {
      totalUnits: 'Total Infrastructure Units',
      fromLastMonth: 'vs last month',
      assetValuation: 'Integrated Asset Valuation',
      valuationHint: 'Estimated FX: $1 / Rp 15,000',
      outboundRequests: 'Active Outbound Requests',
      processedToday: 'Processed today',
      statusOptimal: 'Availability Status: Optimal',
      statusOptimalDesc: 'All critical infrastructure units are operating above the safety threshold.',
      generateReport: 'Generate Report',
      tableTitle: 'Computing Hardware Distribution',
      searchPlaceholder: 'Search SKU or Device Name...',
      skuCol: 'SKU',
      deviceNameCol: 'Device Name',
      stockCol: 'Current Stock',
      conditionCol: 'Condition',
      quickActionCol: 'Quick Action',
      deployBtn: 'Deploy 1 Unit',
      noItems: 'No matching devices found.',
      reportSuccess: 'Inventory report generated successfully',
      deploySuccess: '1 unit deployed successfully'
    },
    finance: {
      totalRevenueMonth: 'Total Revenue (This Month)',
      targetOverachieved: 'vs monthly target',
      outstandingInvoices: 'Outstanding Invoices',
      overdueInvoices: 'Invoices past due date',
      cashEquivalents: 'Cash & Cash Equivalents',
      liquiditySafe: 'Liquidity Position Healthy & Secure',
      tableTitle: 'General Ledger & Active Invoices',
      searchPlaceholder: 'Search Invoice # or Client...',
      invNumberCol: 'Invoice #',
      clientCol: 'Client / Partner',
      dueDateCol: 'Due Date',
      amountCol: 'Amount',
      statusCol: 'Status',
      actionCol: 'Action',
      receiptBtn: 'Receipt',
      sendWarningBtn: 'Send Warning',
      noInvoices: 'No matching invoices found.',
      warningSent: 'Automated warning email sent to client',
      paidBadge: 'Paid',
      overdueBadge: 'Overdue',
      pendingBadge: 'Pending'
    },
    hr: {
      totalEmployees: 'Total Active Personnel',
      newHiresMonth: 'New hires this month',
      payrollEstimate: 'Estimated Monthly Payroll',
      disbursementDate: 'Disbursement: 25th of month',
      pendingLeaves: 'Pending Leave Requests',
      waitingManager: 'Awaiting manager approval',
      tableTitle: 'HR & Payroll Directory',
      searchPlaceholder: 'Search Employee Name or ID...',
      empIdCol: 'Employee ID',
      empNameCol: 'Employee Name',
      deptCol: 'Department',
      roleCol: 'Position / Role',
      statusCol: 'Status',
      actionCol: 'Action',
      scheduleOnboardBtn: 'Schedule Onboard',
      profileBtn: 'Profile',
      noEmployees: 'No matching employees found.',
      managePayrollBtn: 'Manage Payroll'
    },
    purchase: {
      title: 'Create New Purchase Order',
      formTitle: 'Procurement Order Form',
      formDesc: 'Enter specifications and quantities for procurement through approved vendors.',
      vendorLabel: 'Supplier / Vendor',
      selectVendor: 'Select Vendor...',
      skuLabel: 'Device SKU / Model Name',
      qtyLabel: 'Quantity (Units)',
      priceLabel: 'Estimated Total Amount (Rp)',
      notesLabel: 'Urgency & Notes',
      notesPlaceholder: 'Add procurement notes or delivery instructions...',
      cancelBtn: 'Cancel',
      submitBtn: 'Submit Order',
      processing: 'Processing...',
      confirmedTitle: 'Order Confirmed',
      confirmedDesc: 'has been generated and submitted for management approval.',
      returnBtn: 'Return to Procurement'
    },
    analytics: {
      title: 'Analytics & Reporting',
      subtitle: 'Multi-dimensional insights across your enterprise operational data.',
      exportReport: 'Export Report',
      aiTitle: 'Inventora AI Data Analyst',
      aiSubtitle: 'Ask conversational analytical questions about budgeting, vendor concentration, and cash flow projections.',
      aiPlaceholder: 'e.g. What percentage of the budget does Engineering hold and how does it compare to marketing?',
      askAiBtn: 'Ask AI',
      analyzingBtn: 'Analyzing...',
      analysisResult: 'Analysis Result',
      prompt1: 'Summarize budget and cash flow health',
      prompt2: 'Analyze vendor concentration risk',
      prompt3: 'Recommend cost optimization actions',
      deptBudgetAllocation: 'Department Budget Allocation',
      topVendors: 'Top Vendors by Volume',
      cashFlowForecast: 'Cash Flow Forecast'
    }
  }
};
