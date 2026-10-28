import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, PackageCheck } from 'lucide-react';
import type { PurchaseOrder, GoodsReceiptNote, GoodsReceiptItem, ThreeWayMatchStatus } from '../types';
import { Modal, Button } from './UI';
import { receiptOrderItems, receiptMatchStatus, validatedReceiptPatch } from '../lib/goodsReceipt';
import { businessDate } from '../lib/businessDates';

interface ThreeWayMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onSaveGrn: (poId: string, grn: GoodsReceiptNote, newMatchStatus: ThreeWayMatchStatus) => Promise<void>;
  canEdit?: boolean;
  lang?: 'en' | 'id';
}

function inspectionItems(po: PurchaseOrder): GoodsReceiptItem[] {
  const expected = receiptOrderItems(po);
  const saved = po.grn?.items;
  if (!saved?.length) return expected;
  if (!Array.isArray(saved) || saved.length !== expected.length || saved.some((item, index) => !item
    || item.sku !== expected[index].sku || item.orderedQty !== expected[index].orderedQty
    || !Number.isSafeInteger(item.receivedQty) || item.receivedQty < 0
    || !['GOOD', 'EXCELLENT', 'DAMAGED', 'SHORTAGE'].includes(item.condition))) {
    throw new Error('Rincian penerimaan tersimpan tidak valid. Periksa data GRN sebelum melanjutkan.');
  }
  return saved.map(item => ({ ...item, name: expected.find(line => line.sku === item.sku)!.name }));
}

export function ThreeWayMatchModal({ isOpen, onClose, po, onSaveGrn, canEdit = true, lang = 'en' }: ThreeWayMatchModalProps) {
  const formId = useId();
  const saving = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [suratJalan, setSuratJalan] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [items, setItems] = useState<GoodsReceiptItem[]>(() => {
    if (!po) return [];
    try { return inspectionItems(po); }
    catch { return []; }
  });
  const en = lang === 'en';
  const say = (id: string, english: string) => en ? english : id;

  useEffect(() => {
    if (!isOpen || !po) return;
    setSuratJalan(po.grn?.suratJalanNumber || `SJ-${po.id.replace('PO-', '')}-WH1`);
    setReceivedBy(po.grn?.receivedBy || '');
    setInspectorNotes(po.grn?.inspectorNotes || '');
    setSaveError(null);
    try {
      setItems(inspectionItems(po));
    } catch (error) {
      setItems([]);
      setSaveError(error instanceof Error ? error.message : String(error));
    }
    // Keep edits when the language or a live snapshot changes for the same PO.
  }, [isOpen, po?.id]);

  if (!isOpen || !po) return null;
  const matchStatus = receiptMatchStatus(items);
  const matched = matchStatus === 'MATCHED';
  const matchedCount = items.filter(item => receiptMatchStatus([item]) === 'MATCHED').length;
  const updateItem = (index: number, patch: Partial<GoodsReceiptItem>) => {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const handleConfirmGrn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit || saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setSaveError(null);
    const identifier = crypto.randomUUID();
    const grn: GoodsReceiptNote = {
      id: po.grn?.id || `GRN-${identifier}`,
      grnNumber: po.grn?.grnNumber || `GRN-${new Date().getFullYear()}-${identifier.slice(0, 8).toUpperCase()}`,
      poId: po.id, receivedDate: businessDate(), receivedBy: receivedBy.trim(),
      suratJalanNumber: suratJalan.trim(), items, status: matchStatus, inspectorNotes,
    };
    try {
      validatedReceiptPatch(po, grn, 'Warehouse Manager');
      await onSaveGrn(po.id, grn, matchStatus);
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  return <Modal isOpen={isOpen} onClose={onClose} closeDisabled={isSaving} size="xl"
    title={say('Penerimaan barang', 'Goods receipt')}
    footer={<div className="grn-footer">
      <p aria-live="polite">{!canEdit
        ? say('PO ini hanya dapat dilihat.', 'This order is read-only.')
        : !receivedBy.trim() || !suratJalan.trim()
          ? say('Lengkapi surat jalan dan nama penerima.', 'Enter the delivery note and receiver name.')
          : matched ? say('Sesuai pesanan', 'Matches the order') : say('Selisih akan dicatat.', 'The discrepancy will be recorded.')}</p>
      <div><Button variant="secondary" disabled={isSaving} onClick={onClose}>{say('Tutup', 'Close')}</Button>
        {canEdit && <Button type="submit" form={formId} isLoading={isSaving} disabled={!items.length}>
          <PackageCheck size={16} aria-hidden="true" />{say('Simpan penerimaan', 'Save receipt')}
        </Button>}
      </div>
    </div>}>
    <form id={formId} className="grn-form" onSubmit={handleConfirmGrn}>
      <div className="grn-order"><div><span>{po.id}</span><h4>{po.vendor}</h4></div>
        <strong>Rp {po.total.toLocaleString(en ? 'en-US' : 'id-ID')}</strong>
      </div>
      <div className={`grn-result ${matched ? 'is-matched' : ''}`} role="status">
        {matched ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
        <span>{matched ? say('Jumlah dan kondisi sesuai', 'Quantity and condition match') : say('Periksa jumlah dan kondisi barang', 'Check quantities and condition')}</span>
        <small>{matchedCount}/{items.length} {say('sesuai', 'matched')}</small>
      </div>
      {!canEdit && <p className="grn-help">{say('Pencatatan hanya tersedia untuk petugas gudang pada PO yang disetujui atau perlu perbaikan penerimaan.', 'Receipt entry is available to warehouse staff after approval or when a receipt needs correction.')}</p>}
      <fieldset disabled={!canEdit || isSaving}>
        <div className="grn-section-heading"><h4>{say('Barang yang diterima', 'Received items')}</h4>
          {canEdit && <Button variant="secondary" onClick={() => setItems(current => current.map(item => ({ ...item, receivedQty: item.orderedQty, condition: 'GOOD' })))}>{say('Isi sesuai pesanan', 'Fill ordered quantities')}</Button>}
        </div>
        <div className="grn-items"><table>
          <caption className="sr-only">{say('Pemeriksaan barang untuk', 'Item inspection for')} {po.id}</caption>
          <thead><tr><th scope="col">{say('Barang / SKU', 'Item / SKU')}</th><th scope="col">{say('Dipesan', 'Ordered')}</th><th scope="col">{say('Diterima', 'Received')}</th><th scope="col">{say('Kondisi', 'Condition')}</th><th scope="col">{say('Hasil', 'Result')}</th></tr></thead>
          <tbody>{items.map((item, index) => {
            const valid = Number.isSafeInteger(item.receivedQty) && item.receivedQty >= 0;
            const exact = receiptMatchStatus([item]) === 'MATCHED';
            const result = !valid ? say('Jumlah tidak valid', 'Invalid quantity')
              : item.condition === 'DAMAGED' ? say('Rusak', 'Damaged')
                : item.receivedQty < item.orderedQty ? `${say('Kurang', 'Short')} ${item.orderedQty - item.receivedQty}`
                  : item.receivedQty > item.orderedQty ? `${say('Lebih', 'Over')} ${item.receivedQty - item.orderedQty}`
                    : exact ? say('Sesuai', 'Matched') : say('Periksa kondisi', 'Check condition');
            return <tr key={`${item.sku}:${index}`}>
              <td className="grn-product"><strong>{item.name}</strong><small>{item.sku}</small></td>
              <td data-label={say('Dipesan', 'Ordered')} className="grn-ordered">{item.orderedQty}</td>
              <td data-label={say('Diterima', 'Received')}><input type="number" required min="0" step="1"
                aria-label={`${say('Jumlah diterima', 'Received quantity')}: ${item.name}`}
                aria-invalid={!valid || undefined} value={Number.isFinite(item.receivedQty) ? item.receivedQty : ''}
                onChange={event => updateItem(index, { receivedQty: event.target.valueAsNumber })} /></td>
              <td data-label={say('Kondisi', 'Condition')}><select value={item.condition}
                aria-label={`${say('Kondisi', 'Condition')}: ${item.name}`}
                onChange={event => updateItem(index, { condition: event.target.value as GoodsReceiptItem['condition'] })}>
                <option value="GOOD">{say('Baik', 'Good')}</option><option value="EXCELLENT">{say('Sempurna', 'Excellent')}</option>
                <option value="DAMAGED">{say('Rusak', 'Damaged')}</option><option value="SHORTAGE">{say('Kurang', 'Shortage')}</option>
              </select></td>
              <td data-label={say('Hasil', 'Result')}><span className={`grn-line-result ${exact ? 'is-matched' : ''}`}>{result}</span></td>
            </tr>;
          })}</tbody>
        </table></div>
        <div className="grn-delivery">
          <label htmlFor={`${formId}-note`}>{say('Nomor surat jalan', 'Delivery note number')} <span aria-hidden="true">*</span>
            <input id={`${formId}-note`} required maxLength={500} value={suratJalan} onChange={event => setSuratJalan(event.target.value)} />
          </label>
          <label htmlFor={`${formId}-receiver`}>{say('Nama penerima', 'Receiver name')} <span aria-hidden="true">*</span>
            <input id={`${formId}-receiver`} required maxLength={500} autoComplete="name" value={receivedBy} onChange={event => setReceivedBy(event.target.value)} />
          </label>
        </div>
        <details className="po-extra"><summary>{say('Catatan pemeriksaan', 'Inspection notes')} <span>{say('opsional', 'optional')}</span></summary>
          <label className="sr-only" htmlFor={`${formId}-notes`}>{say('Catatan pemeriksaan', 'Inspection notes')}</label>
          <textarea id={`${formId}-notes`} maxLength={4000} rows={3} value={inspectorNotes} onChange={event => setInspectorNotes(event.target.value)} />
        </details>
      </fieldset>
      {saveError && <p className="po-form-error" role="alert">{saveError}</p>}
    </form>
  </Modal>;
}
