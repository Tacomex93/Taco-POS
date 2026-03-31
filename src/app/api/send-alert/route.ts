import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, items, to } = body as {
      type: 'low_stock' | 'delayed_orders';
      items: { name: string; detail: string }[];
      to?: string;
    };

    if (!items?.length) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      return NextResponse.json({ error: 'Email credentials not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    const isStock = type === 'low_stock';
    const subject = isStock
      ? '⚠️ Taquería POS — Productos con stock bajo'
      : '🚨 Taquería POS — Pedidos con retraso';

    const rows = items
      .map(
        (i) => `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-weight:700;">${i.name}</td>
          <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;color:#ea580c;">${i.detail}</td>
        </tr>`
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
    <div style="background:#ea580c;padding:32px 40px;">
      <p style="margin:0;color:#fff;font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;">Taquería POS</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:26px;font-weight:900;">${isStock ? '📦 Stock Bajo' : '⏱️ Pedidos Atrasados'}</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#52525b;font-size:14px;margin:0 0 24px;">
        ${isStock
          ? 'Los siguientes productos están por debajo del nivel mínimo de inventario:'
          : 'Los siguientes pedidos llevan demasiado tiempo abiertos:'}
      </p>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #f0f0f0;">
        <thead>
          <tr style="background:#fafafa;">
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#a1a1aa;">${isStock ? 'Producto' : 'Pedido'}</th>
            <th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:900;letter-spacing:0.15em;text-transform:uppercase;color:#a1a1aa;">${isStock ? 'Stock actual / mínimo' : 'Detalle'}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:28px 0 0;color:#a1a1aa;font-size:12px;">
        Generado automáticamente por Taquería POS · ${new Date().toLocaleString('es-MX')}
      </p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"Taquería POS" <${user}>`,
      to: to ?? user,
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('[send-alert]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
