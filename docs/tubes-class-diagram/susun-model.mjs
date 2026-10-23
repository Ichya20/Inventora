import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const sources = [
  'src/types.ts', 'src/components/HRView.tsx',
  'src/components/BillingSubscriptionView.tsx',
  'docs/tubes-class-diagram/kerangka.ts',
];
const parsed = sources.map(name => {
  const raw = fs.readFileSync(path.join(root, name), 'utf8');
  return { name, raw, ast: ts.createSourceFile(name, raw,
    ts.ScriptTarget.Latest, true, name.endsWith('tsx')
      ? ts.ScriptKind.TSX : ts.ScriptKind.TS) };
});
const clean = text => text.replace(/\s+/g, ' ').trim();
const access = node => node.modifiers?.some(m =>
  m.kind === ts.SyntaxKind.PrivateKeyword) ? 'private'
  : node.modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword)
    ? 'protected' : 'public';
const params = node => node.parameters.map(p => ({
  name: p.name.getText(), type: clean(p.type?.getText() || 'unknown'),
  optional: !!p.questionToken,
}));
const classes = [];
const wanted = new Set([
  'PurchaseOrder', 'POLineItem', 'GoodsReceiptNote',
  'GoodsReceiptItem', 'PaymentTransaction', 'DepartmentBudget',
  'Employee', 'EmployeeSalary', 'PayrollDisbursementRecord',
  'UserSession', 'InventoryItem', 'InvoiceRecord',
  'SubscriptionInvoice', 'SubscriptionRecord',
]);
for (const source of parsed) {
  for (const node of source.ast.statements) {
    if (ts.isClassDeclaration(node)) {
      const attrs = [], methods = [];
      for (const member of node.members) {
        if (ts.isPropertyDeclaration(member)) attrs.push({
          name: member.name.getText(),
          type: clean(member.type?.getText() || 'unknown'),
          access: access(member),
        });
        if (ts.isConstructorDeclaration(member)) {
          methods.push({ name: 'constructor', params: params(member),
            returns: '', access: access(member) });
          for (const p of member.parameters) {
            if (p.modifiers?.some(m => [ts.SyntaxKind.PrivateKeyword,
              ts.SyntaxKind.PublicKeyword, ts.SyntaxKind.ProtectedKeyword]
              .includes(m.kind))) attrs.push({
              name: p.name.getText(), type: clean(p.type.getText()),
              access: access(p),
            });
          }
        }
        if (ts.isMethodDeclaration(member)) methods.push({
          name: member.name.getText(), params: params(member),
          returns: clean(member.type?.getText() || 'void'),
          access: access(member),
        });
      }
      classes.push({ name: node.name.text, kind: 'class',
        source: source.name, attrs, methods });
    }
    if (ts.isInterfaceDeclaration(node) && wanted.has(node.name.text)) {
      classes.push({ name: node.name.text, kind: 'interface',
        source: source.name, attrs: node.members.filter(ts.isPropertySignature)
          .map(p => ({ name: p.name.getText() + (p.questionToken ? '?' : ''),
            type: clean(p.type.getText()), access: 'public' })), methods: [] });
      if (node.name.text === 'PurchaseOrder') {
        const payment = node.members.find(p => p.name?.getText() === 'paymentInfo');
        classes.push({ name: 'PaymentInfo', kind: 'interface',
          source: 'src/types.ts: PurchaseOrder.paymentInfo',
          attrs: payment.type.members.map(p => ({ name: p.name.getText(),
            type: clean(p.type.getText()), access: 'public' })), methods: [] });
      }
    }
  }
}
const hr = parsed.find(s => s.name.endsWith('HRView.tsx'));
const hrNames = new Set(['Employee', 'EmployeeSalary', 'PayrollDisbursementRecord']);
const declarations = hr.ast.statements.filter(n =>
  ts.isInterfaceDeclaration(n) && hrNames.has(n.name.text)).map(n => n.getText());
const billing = parsed.find(s => s.name.endsWith('BillingSubscriptionView.tsx'));
declarations.push(billing.ast.statements.find(n =>
  ts.isTypeAliasDeclaration(n) && n.name.text === 'SubscriptionTier').getText());
fs.writeFileSync(path.join(here, 'data-models.ts'),
  '// Salinan deklarasi tipe sumber pada 21 Oktober 2026.\n'
  + '// Dipisahkan agar pemeriksaan kerangka tidak memuat komponen UI.\n'
  + declarations.join('\n\n') + '\n');

const relations = [
  ['PurchaseOrder', 'POLineItem', '*--', '1', '0..*'],
  ['PurchaseOrder', 'GoodsReceiptNote', '*--', '1', '0..1'],
  ['PurchaseOrder', 'PaymentInfo', '*--', '1', '0..1'],
  ['GoodsReceiptNote', 'GoodsReceiptItem', '*--', '1', '0..*'],
  ['PurchaseOrder', 'PaymentTransaction', '--', '1', '0..*'],
  ['Employee', 'EmployeeSalary', '*--', '1', '1'],
  ['Employee', 'PayrollDisbursementRecord', '--', '1', '0..*'],
  ['SubscriptionRecord', 'SubscriptionInvoice', '*--', '1', '0..*'],
  ['LoginController', 'AuthService', '..>', '', ''],
  ['LoginController', 'AuthorizationPolicy', '..>', '', ''],
  ['AuthService', 'UserSession', '..>', '', ''],
  ['PurchaseOrderModel', 'PurchaseOrder', '--', '1', '1'],
  ['GoodsReceiptModel', 'GoodsReceiptNote', '--', '1', '1'],
  ['ProcurementService', 'PurchaseOrderRepository', '..>', '', ''],
  ['ProcurementService', 'AuthorizationPolicy', '..>', '', ''],
  ['InventoryService', 'InventoryItem', '..>', '', ''],
  ['PayrollService', 'Employee', '..>', '', ''],
  ['PayrollService', 'PayrollDisbursementRecord', '..>', '', ''],
  ['FinanceService', 'InvoiceRecord', '..>', '', ''],
  ['BillingService', 'SubscriptionRecord', '..>', '', ''],
];
const symbol = a => a === 'private' ? '-' : a === 'protected' ? '#' : '+';
function methodText(m) {
  return symbol(m.access) + ' ' + m.name + '(' + m.params.map(p =>
    p.name + (p.optional ? '?' : '') + ': ' + p.type).join(', ')
    + ')' + (m.returns ? ': ' + m.returns : '');
}
const model = { classes, relations,
  hashes: parsed.map(p => ({ file: p.name,
    sha256: createHash('sha256').update(fs.readFileSync(path.join(root, p.name))).digest('hex') })) };
fs.writeFileSync(path.join(here, 'model.json'), JSON.stringify(model, null, 2) + '\n');
const uml = ['@startuml', 'skinparam monochrome true',
  'skinparam classAttributeIconSize 0', 'hide empty methods'];
for (const c of classes) {
  uml.push(`${c.kind} ${c.name} {`);
  for (const a of c.attrs) {
    const type = c.name === 'PurchaseOrder' && a.name === 'paymentInfo?'
      ? 'PaymentInfo' : a.type;
    uml.push('  ' + symbol(a.access) + ' ' + a.name + ': ' + type);
  }
  for (const m of c.methods) uml.push('  ' + methodText(m));
  uml.push('}');
}
for (const [from, to, kind, left, right] of relations) {
  uml.push(left ? `${from} "${left}" ${kind} "${right}" ${to}`
    : `${from} ${kind} ${to}`);
}
uml.push('@enduml');
fs.writeFileSync(path.join(here, 'Inventora_Class_Diagram.puml'), uml.join('\n') + '\n');
console.log(JSON.stringify({ classes: classes.filter(c => c.kind === 'class').length,
  interfaces: classes.filter(c => c.kind === 'interface').length,
  relations: relations.length }));
