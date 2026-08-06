const PDFDocument = require('pdfkit');

const GOLD = '#D4AF37';
const DARK = '#17161A';
const GREY = '#6B6B6F';
const LIGHT_GREY = '#E5E5E5';

function fmtMoney(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Builds a line-item list from an order, covering every shape an order can
// take: unified `items` array (products and/or designs), or the legacy
// single `design` field on old orders.
function buildLineItems(order) {
  if (order.items && order.items.length) {
    return order.items.map((item) => ({
      name: item.name || item.product?.name || item.design?.designName || 'Item',
      detail: item.size ? `Size: ${item.size}` : '',
      quantity: item.quantity || 1,
      price: item.price || 0,
    }));
  }

  if (order.design) {
    const fabricName = order.design.fabric?.name;
    return [
      {
        name: order.design.designName || 'Custom Design',
        detail: fabricName ? `Fabric: ${fabricName}` : '',
        quantity: 1,
        price: order.totalAmount,
      },
    ];
  }

  return [];
}

// Streams a branded invoice PDF for the given (already-populated) order
// directly into the provided writable stream (typically the Express `res`).
function generateInvoicePDF(order, outputStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(outputStream);

  const shortId = order._id.toString().slice(-8).toUpperCase();
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header
  doc
    .fillColor(GOLD)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('ZHR Clothing', 50, 50);
  doc
    .fillColor(GREY)
    .font('Helvetica')
    .fontSize(9)
    .text('Custom Tailoring & Ready-to-Wear', 50, 76);

  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(16)
    .text('INVOICE', 0, 50, { align: 'right', width: pageWidth + 50 });
  doc
    .fillColor(GREY)
    .font('Helvetica')
    .fontSize(9)
    .text(`Order #${shortId}`, 0, 72, { align: 'right', width: pageWidth + 50 })
    .text(`Date: ${fmtDate(order.createdAt)}`, 0, 86, { align: 'right', width: pageWidth + 50 });

  doc.moveTo(50, 110).lineTo(50 + pageWidth, 110).strokeColor(GOLD).lineWidth(1.5).stroke();

  // Billed-to / delivery block
  let y = 128;
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10).text('Billed To', 50, y);
  y += 15;
  doc
    .fillColor(GREY)
    .font('Helvetica')
    .fontSize(9.5)
    .text(order.user?.name || 'Customer', 50, y);
  y += 13;
  if (order.user?.email) {
    doc.text(order.user.email, 50, y);
    y += 13;
  }
  const addr = order.deliveryAddress || {};
  if (addr.addressLine) {
    doc.text(`${addr.addressLine}, ${addr.city || ''}`, 50, y, { width: pageWidth / 2 - 10 });
    y += 13;
  }
  if (addr.phone) {
    doc.text(`Phone: ${addr.phone}`, 50, y);
    y += 13;
  }

  doc
    .fillColor(DARK)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('Payment', 50 + pageWidth / 2, 128);
  doc
    .fillColor(GREY)
    .font('Helvetica')
    .fontSize(9.5)
    .text(`Method: ${order.paymentMethod || 'COD'}`, 50 + pageWidth / 2, 143)
    .text(`Status: ${order.status}`, 50 + pageWidth / 2, 156);
  if (order.paymentMethod === 'Advance Transfer') {
    doc
      .text(`Advance Paid: ${fmtMoney(order.advanceAmount)}`, 50 + pageWidth / 2, 169)
      .text(`Remaining: ${fmtMoney(order.remainingAmount)}`, 50 + pageWidth / 2, 182);
  }

  y = Math.max(y, 210) + 15;

  // Items table header
  const rightEdge = 50 + pageWidth;
  const col = {
    name: 50,
    qtyX: rightEdge - 220,
    qtyW: 40,
    priceX: rightEdge - 160,
    priceW: 70,
    totalX: rightEdge - 80,
    totalW: 70,
  };
  doc.rect(50, y, pageWidth, 22).fill(DARK);
  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(9)
    .text('Item', col.name + 8, y + 6)
    .text('Qty', col.qtyX, y + 6, { width: col.qtyW, align: 'center' })
    .text('Price', col.priceX, y + 6, { width: col.priceW, align: 'right' })
    .text('Total', col.totalX, y + 6, { width: col.totalW, align: 'right' });
  y += 22;

  const items = buildLineItems(order);
  doc.font('Helvetica').fontSize(9.5);
  items.forEach((item, i) => {
    const rowHeight = item.detail ? 34 : 24;
    if (i % 2 === 0) {
      doc.rect(50, y, pageWidth, rowHeight).fill(LIGHT_GREY);
    }
    doc.fillColor(DARK).font('Helvetica').fontSize(9.5).text(item.name, col.name + 8, y + 6, {
      width: col.qtyX - col.name - 16,
    });
    if (item.detail) {
      doc.fillColor(GREY).fontSize(8).text(item.detail, col.name + 8, y + 19, {
        width: col.qtyX - col.name - 16,
      });
    }
    doc
      .fillColor(DARK)
      .fontSize(9.5)
      .text(String(item.quantity), col.qtyX, y + 6, { width: col.qtyW, align: 'center' })
      .text(fmtMoney(item.price), col.priceX, y + 6, { width: col.priceW, align: 'right' })
      .text(fmtMoney(item.price * item.quantity), col.totalX, y + 6, { width: col.totalW, align: 'right' });
    y += rowHeight;
  });

  y += 10;
  doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor(LIGHT_GREY).lineWidth(1).stroke();
  y += 12;

  // Totals block
  const totalsX = 50 + pageWidth - 200;
  const addTotalRow = (label, value, opts = {}) => {
    doc
      .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(opts.bold ? 11 : 9.5)
      .fillColor(opts.bold ? DARK : GREY)
      .text(label, totalsX, y, { width: 110 })
      .fillColor(opts.gold ? GOLD : opts.bold ? DARK : GREY)
      .text(value, totalsX + 110, y, { width: 90, align: 'right' });
    y += opts.bold ? 20 : 16;
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (order.discountAmount > 0) {
    addTotalRow('Subtotal', fmtMoney(subtotal));
    addTotalRow(
      `Discount${order.couponCode ? ` (${order.couponCode})` : ''}`,
      `- ${fmtMoney(order.discountAmount)}`
    );
  }
  addTotalRow('Total Amount', fmtMoney(order.totalAmount), { bold: true, gold: true });

  // Footer
  const footerY = doc.page.height - 80;
  doc
    .moveTo(50, footerY)
    .lineTo(50 + pageWidth, footerY)
    .strokeColor(LIGHT_GREY)
    .lineWidth(1)
    .stroke();
  doc
    .fillColor(GREY)
    .font('Helvetica')
    .fontSize(8.5)
    .text('Thank you for shopping with ZHR Clothing!', 50, footerY + 12, { width: pageWidth, align: 'center' })
    .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 26, {
      width: pageWidth,
      align: 'center',
    });

  doc.end();
}

module.exports = { generateInvoicePDF };