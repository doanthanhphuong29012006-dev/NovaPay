import crypto from 'crypto';
import { env } from '../src/config/env.config';

async function simulatePaymentGatewayWebhook(targetWalletId: string) {
    const payload = {
        provider: 'VNPAY',
        providerTransactionId: 'VNP_TX_20261022_9999',
        targetWalletId,
        amount: 500000,
        currency: 'VND',
        status: 'SUCCESS',
    };

    const rawBody = JSON.stringify(payload);
    const timestamp = Date.now().toString();

    const signature = crypto
        .createHmac('sha256', env.WEBHOOK_SECRET)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

    console.log('Cổng thanh toán đang bắn Webhook nạp 500,000 VND...');

    const response = await fetch(`http://localhost:${env.PORT}/api/v1/wallets/deposit-webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Signature': signature,
        },
        body: rawBody,
    });

    console.log('Kết quả từ Server: ', await response.json());
}