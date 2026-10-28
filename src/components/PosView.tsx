import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Banknote, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { Button, Modal } from './UI';
import { ChangeHighlight, SuccessMark } from './MotionFeedback';
import { workspaceMotion } from '../lib/motion';
import { canAccessMenu } from '../lib/authorization';
import { calculateSale, checkoutSale, readCommerce, type CommerceState, type SaleInputLine, type SaleTransaction } from '../lib/commerce';
import type { Language, Role, ToastFunction } from '../types';
import './PosView.css';

type Props = { role: Role; actorId: string; actorName: string; lang: Language; onToast: ToastFunction };

export function PosView({ role, actorId, actorName, lang, onToast }: Props) {
  const en = lang === 'en';
  const reduced = useReducedMotion();
  const say = (id: string, english: string) => en ? english : id;
  const money = (value: number) => `Rp ${value.toLocaleString(en ? 'en-US' : 'id-ID')}`;
  const [source, setSource] = useState<{ data: CommerceState | null; error: string }>(() => {
    try { return { data: readCommerce(), error: '' }; } catch (error) { return { data: null, error: String(error) }; }
  });
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<SaleInputLine[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [cash, setCash] = useState('');
  const [busy, setBusy] = useState(false);
  const processing = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const [receipt, setReceipt] = useState<SaleTransaction | null>(null);
  const [freshReceipt, setFreshReceipt] = useState(false);
  const refresh = () => {
    try { setSource({ data: readCommerce(), error: '' }); }
    catch (error) { setSource({ data: null, error: String(error) }); }
  };
  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('inventora:data-changed', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('inventora:data-changed', refresh); };
  }, []);
  let totals: ReturnType<typeof calculateSale> | null = null;
  try { totals = calculateSale(cart, taxRate); } catch { /* Incomplete inputs stay editable until checkout. */ }
  const products = source.data?.inventory ?? [];
  const visible = products.filter(product => `${product.id} ${product.name}`.toLowerCase().includes(search.toLowerCase()));
  const update = (sku: string, field: 'quantity' | 'unitPrice' | 'discountPercent', value: number) => {
    requestId.current = crypto.randomUUID();
    setCart(current => current.map(item => item.sku === sku ? { ...item, [field]: value } : item));
  };
  const add = (sku: string) => {
    const product = products.find(item => item.id === sku);
    if (!product || !product.stock || busy) return;
    requestId.current = crypto.randomUUID();
    setCart(current => {
      const existing = current.find(item => item.sku === sku);
      if (existing) return current.map(item => item.sku === sku ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) } : item);
      return [...current, { sku, quantity: 1, unitPrice: product.unitPrice ?? 0, discountPercent: 0 }];
    });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (processing.current) return;
    processing.current = true; setBusy(true);
    try {
      const sale = await checkoutSale({ requestId: requestId.current, actorId, actorName, role, lines: cart, taxRate, amountPaid: cash.trim() ? Number(cash) : NaN });
      setFreshReceipt(true); setReceipt(sale); setCart([]); setCash(''); requestId.current = crypto.randomUUID(); refresh();
      onToast(say('Penjualan tersimpan dan stok diperbarui.', 'Sale saved and stock updated.'), 'success', { title: say('Penjualan tersimpan', 'Sale saved') });
    } catch (error) { onToast(String(error instanceof Error ? error.message : error), 'error'); refresh(); }
    finally { processing.current = false; setBusy(false); }
  };
  const exportReceipt = async (print: boolean) => {
    if (!receipt) return;
    try {
      const output = await import('../lib/saleReceipt');
      if (print) output.printSaleReceipt(receipt, lang);
      else output.createSaleReceiptPdf(receipt, lang).save(`${receipt.id}.pdf`);
    } catch { onToast(say('Struk belum dapat dibuat. Transaksi tetap tersimpan.', 'Receipt could not be generated. Your sale is still saved.'), 'error'); }
  };

  if (!canAccessMenu(role, 'pos')) return <p role="alert">{say('Anda tidak memiliki akses POS.', 'You do not have POS access.')}</p>;
  return <section className="pos-workspace">
    <header className="pos-heading"><div><h2>{say('Kasir penjualan', 'Point of Sale')}</h2><p>{say('Pilih barang, isi harga jual, lalu terima pembayaran tunai.', 'Choose products, enter selling prices, then take cash payment.')}</p></div><Banknote size={26} strokeWidth={1.5} aria-hidden="true" /></header>
    <details className="pos-source"><summary>{say('Data lokal di browser ini', 'Local data in this browser')}</summary><p>{say('Penjualan dan stok belum disinkronkan ke Firestore. Harga jual diisi kasir; PPN 11% adalah simulasi.', 'Sales and stock are not synced to Firestore. The cashier enters selling prices; 11% VAT is simulated.')}</p></details>
    {source.error && <div className="pos-error" role="alert"><p>{source.error}</p><Button variant="secondary" onClick={refresh}>{say('Coba baca ulang', 'Retry loading')}</Button></div>}
    <div className="pos-layout">
      <div className="pos-catalog"><label className="pos-search"><Search size={17} aria-hidden="true" /><span className="sr-only">{say('Cari nama atau SKU', 'Search product name or SKU')}</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={say('Cari nama atau SKU', 'Search product name or SKU')} /></label>
        <div className="pos-product-list">{visible.map(product => <button type="button" key={product.id} disabled={!product.stock || busy} onClick={() => add(product.id)} className="pos-product"><span><strong>{product.name}</strong><small>{product.id}</small><small>{say('Stok', 'Stock')}: {product.stock}{product.unitPrice ? ` · ${money(product.unitPrice)}` : ` · ${say('Harga belum diisi', 'Selling price not set')}`}</small></span><Plus size={17} aria-hidden="true" /></button>)}</div>
        {!visible.length && <p className="pos-empty">{say('Tidak ada barang yang cocok.', 'No matching products.')}</p>}
      </div>
      <form className="pos-checkout" onSubmit={submit}>
        <fieldset disabled={busy || !!source.error}><legend>{say('Keranjang penjualan', 'Sales cart')} <ChangeHighlight value={cart.reduce((sum, item) => sum + item.quantity, 0)}>{cart.length} SKU</ChangeHighlight></legend>
          {!cart.length && <p className="pos-empty">{say('Pilih barang dari katalog untuk memulai.', 'Choose a product from the catalogue to begin.')}</p>}
          <div className="pos-cart-lines"><AnimatePresence initial={false}>{cart.map(item => <motion.div className="pos-cart-line" key={item.sku} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: reduced ? 0 : workspaceMotion.exit } }} transition={{ duration: reduced ? 0 : workspaceMotion.feedback, ease: workspaceMotion.ease }}><div className="pos-cart-name"><ChangeHighlight value={`${item.quantity}:${item.unitPrice}:${item.discountPercent}`}><strong>{products.find(product => product.id === item.sku)?.name ?? item.sku}</strong></ChangeHighlight><button type="button" onClick={() => { requestId.current = crypto.randomUUID(); setCart(current => current.filter(line => line.sku !== item.sku)); }} aria-label={`${say('Hapus', 'Remove')} ${item.sku}`}><Trash2 size={16} /></button></div><small>{item.sku}</small>
            <div className="pos-line-fields"><label>{say('Jumlah', 'Quantity')}<input required type="number" min="1" max={products.find(product => product.id === item.sku)?.stock ?? 0} step="1" value={item.quantity || ''} onChange={event => update(item.sku, 'quantity', Number(event.target.value))} /></label><label>{say('Harga satuan Rp', 'Unit price Rp')}<input required type="number" min="1" step="1" value={item.unitPrice || ''} onChange={event => update(item.sku, 'unitPrice', Number(event.target.value))} /></label><label>{say('Diskon %', 'Discount %')}<input required type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={event => update(item.sku, 'discountPercent', Number(event.target.value))} /></label></div>
            <div className="pos-line-amount"><span>{say('Subtotal barang', 'Item subtotal')}</span><ChangeHighlight value={totals?.items.find(line => line.sku === item.sku)?.total ?? 'invalid'}>{totals ? money(totals.items.find(line => line.sku === item.sku)!.total) : '—'}</ChangeHighlight></div>
          </motion.div>)}</AnimatePresence></div>
          <label className="pos-tax"><input type="checkbox" checked={taxRate === 11} onChange={event => { requestId.current = crypto.randomUUID(); setTaxRate(event.target.checked ? 11 : 0); }} />{say('PPN simulasi 11%', 'Simulated VAT 11%')}</label>
          <dl className="pos-totals"><div><dt>Subtotal</dt><dd>{totals ? money(totals.subtotal) : '—'}</dd></div><div><dt>{say('Diskon', 'Discount')}</dt><dd>{totals ? money(totals.discount) : '—'}</dd></div><div><dt>{say('PPN', 'VAT')}</dt><dd>{totals ? money(totals.tax) : '—'}</dd></div><div className="pos-total"><dt>Total</dt><dd><ChangeHighlight value={totals?.total ?? 'invalid'}>{totals ? money(totals.total) : '—'}</ChangeHighlight></dd></div></dl>
          <label className="pos-cash">{say('Tunai diterima Rp', 'Cash received Rp')}<input type="number" required min={totals?.total ?? 1} step="1" inputMode="numeric" value={cash} onChange={event => { requestId.current = crypto.randomUUID(); setCash(event.target.value); }} /></label>
          <p className="pos-change" aria-live="polite">{say('Kembalian', 'Change')}: <strong>{totals && cash && Number(cash) >= totals.total ? money(Number(cash) - totals.total) : '—'}</strong></p>
          <Button type="submit" isLoading={busy} disabled={!totals || !source.data} className="pos-pay"><Banknote size={17} />{say('Selesaikan penjualan', 'Complete sale')}</Button>
        </fieldset>
      </form>
    </div>
    <section className="pos-history"><h3>{say('Penjualan terakhir', 'Recent sales')}</h3>{!source.data?.sales.length ? <p className="pos-empty">{say('Belum ada penjualan tercatat di browser ini.', 'No sales recorded in this browser yet.')}</p> : <ul>{source.data.sales.slice(-10).reverse().map(sale => <li key={sale.id}><button type="button" onClick={() => { setFreshReceipt(false); setReceipt(sale); }}><span><strong>{sale.id}</strong><small>{new Date(sale.createdAt).toLocaleString(en ? 'en-US' : 'id-ID')} · {sale.items.length} SKU · {sale.actorName}</small></span><span>{money(sale.total)}<Receipt size={16} aria-hidden="true" /></span></button></li>)}</ul>}</section>
    <Modal isOpen={!!receipt} onClose={() => { setReceipt(null); setFreshReceipt(false); }} title={say('Struk penjualan', 'Sales receipt')} footer={<><Button variant="secondary" onClick={() => void exportReceipt(true)}>{say('Cetak', 'Print')}</Button><Button onClick={() => void exportReceipt(false)}>{say('Unduh PDF', 'Download PDF')}</Button></>}>
      {receipt && freshReceipt && <div className="pos-sale-confirmed" role="status"><SuccessMark /><div><strong>{say('Penjualan tersimpan', 'Sale saved')}</strong><p>{say('Stok sudah diperbarui di browser ini.', 'Stock has been updated in this browser.')}</p></div></div>}
      {receipt && <div className="pos-receipt"><strong>Inventora</strong><p>{receipt.id}</p><p>{new Date(receipt.createdAt).toLocaleString(en ? 'en-US' : 'id-ID')}</p><p>{say('Kasir', 'Cashier')}: {receipt.actorName}</p><ul>{receipt.items.map(item => <li key={item.sku}><strong>{item.name}</strong><span>{item.quantity} × {money(item.unitPrice)}{item.discount ? ` · ${say('diskon', 'discount')} ${item.discountPercent}%` : ''}</span><span>{money(item.total)}</span></li>)}</ul><dl className="pos-totals"><div><dt>Subtotal</dt><dd>{money(receipt.subtotal)}</dd></div><div><dt>{say('Diskon', 'Discount')}</dt><dd>{money(receipt.discount)}</dd></div><div><dt>{say('PPN', 'VAT')} {receipt.taxRate}%</dt><dd>{money(receipt.tax)}</dd></div><div className="pos-total"><dt>Total</dt><dd>{money(receipt.total)}</dd></div><div><dt>{say('Tunai diterima', 'Cash received')}</dt><dd>{money(receipt.amountPaid)}</dd></div><div><dt>{say('Kembalian', 'Change')}</dt><dd>{money(receipt.change)}</dd></div></dl></div>}
    </Modal>
  </section>;
}
