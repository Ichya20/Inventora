// Lima PO fiktif dengan field yang dipakai Inventora.
// Tidak membuka koneksi dan tidak menulis ke Firebase.
export const specifications = [
  {
    id: 'PO-2026-IT-DEMO01',
    vendor: 'NVIDIA Corp Indonesia',
    department: 'IT Infrastructure',
    sku: 'NV-H100-TC', name: 'NVIDIA H100 Tensor Core GPU',
    qty: 2, unitPrice: 450000000,
  },
  {
    id: 'PO-2026-OPS-DEMO02',
    vendor: 'Cisco Systems Indonesia',
    department: 'Operations & Logistics',
    sku: 'SW-10GBE-L3', name: '10GbE Network L3 Managed Switch',
    qty: 4, unitPrice: 45000000,
  },
  {
    id: 'PO-2026-RND-DEMO03',
    vendor: 'Dell EMC Indonesia',
    department: 'Engineering & R&D',
    sku: 'STR-NVME-8TB', name: '8TB NVMe Enterprise Storage',
    qty: 10, unitPrice: 18000000,
  },
  {
    id: 'PO-2026-GA-DEMO04',
    vendor: 'APC by Schneider Electric',
    department: 'HR & GA',
    sku: 'UPS-3KVA-RT', name: '3kVA Rackmount UPS',
    qty: 3, unitPrice: 28000000,
  },
  {
    id: 'PO-2026-IT-DEMO05',
    vendor: 'Dell EMC Indonesia',
    department: 'IT Infrastructure',
    sku: 'RS-W1-PRO', name: 'Rack Server Web Infrastructure',
    qty: 1, unitPrice: 120000000,
  },
];

export const pendingDocuments = specifications.map((row, i) => {
  const subtotal = row.qty * row.unitPrice;
  const taxAmount = Math.round(subtotal * 0.11);
  const item = {
    id: `li-demo-${i + 1}`, sku: row.sku, name: row.name,
    qty: row.qty, unitPrice: row.unitPrice, subtotal,
  };
  const { subtotal: itemTotal, ...legacy } = item;
  return {
    id: row.id, vendor: row.vendor,
    desc: `Pengadaan contoh ${row.sku}`,
    date: '21 Okt 2026', deliveryDate: '2026-10-28',
    department: row.department,
    subtotal, discountAmount: 0, taxAmount,
    withholdingTaxAmount: 0,
    total: subtotal + taxAmount,
    status: 'Pending Approval', color: 'orange',
    threeWayMatchStatus: 'PENDING_RECEIPT',
    items: [item],
    lineItems: [{ ...legacy, totalPrice: itemTotal }],
  };
});

export function receiptPatch(po) {
  return {
    status: 'Barang Diterima', color: 'blue',
    threeWayMatchStatus: 'MATCHED',
    grn: {
      id: `GRN-${po.id}`, grnNumber: `GRN-${po.id}`,
      poId: po.id, receivedDate: '2026-10-28',
      receivedBy: 'Petugas Gudang Contoh',
      suratJalanNumber: `SJ-${po.id}`,
      items: po.items.map(item => ({
        sku: item.sku, name: item.name,
        orderedQty: item.qty, receivedQty: item.qty,
        condition: 'GOOD', notes: 'Sesuai pesanan',
      })),
      status: 'MATCHED', inspectorNotes: 'Data uji fiktif',
    },
  };
}

export function paymentPatch(po) {
  return {
    status: 'Selesai', color: 'green',
    paymentInfo: {
      paidAt: '2026-10-29T03:00:00.000Z',
      method: 'Transfer bank (simulasi)',
      txId: `TX-${po.id}`, reference: 'DEMO-TRANSFER-04',
      amount: po.total, accountOrCard: 'DEMO-0004',
      receiptNo: `REC-${po.id}`,
      payerName: 'Inventora (simulasi)',
    },
  };
}

export const finalDocuments = pendingDocuments.map((po, i) => {
  if (i === 0) return po;
  if (i === 4) return { ...po, status: 'Ditolak', color: 'red' };
  const approved = { ...po, status: 'Disetujui', color: 'green' };
  if (i === 1) return approved;
  const received = { ...approved, ...receiptPatch(po) };
  if (i === 2) return received;
  return { ...received, ...paymentPatch(po) };
});
