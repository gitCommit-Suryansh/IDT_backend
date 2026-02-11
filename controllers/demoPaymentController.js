
const ContestParticipation = require('../models/contestParticipation');
const Contest = require('../models/contest');
const path = require('path');

// Served via: GET /api/contests/pay-demo?participationId=...&amount=...
exports.renderDemoPage = (req, res) => {
    const { participationId, amount } = req.query;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Demo Payment Gateway</title>
        <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5; }
            .card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 300px; text-align: center; }
            .amount { font-size: 24px; font-weight: bold; margin: 20px 0; color: #333; }
            button { width: 100%; padding: 12px; margin: 5px 0; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; }
            .btn-success { background: #4caf50; color: white; }
            .btn-fail { background: #f44336; color: white; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>Mock Payment</h2>
            <p>IDT Events Contest Payment</p>
            <div class="amount">₹${amount || '0'}</div>
            <p>Order ID: ${participationId || 'N/A'}</p>
            <form action="/api/contests/pay-demo/complete" method="POST">
                <input type="hidden" name="participationId" value="${participationId}">
                <input type="hidden" name="status" value="SUCCESS">
                <button type="submit" class="btn-success">Approve Payment</button>
            </form>
            <form action="/api/contests/pay-demo/complete" method="POST">
                <input type="hidden" name="participationId" value="${participationId}">
                <input type="hidden" name="status" value="FAILED">
                <button type="submit" class="btn-fail">Reject Payment</button>
            </form>
        </div>
    </body>
    </html>
    `;

    res.send(html);
};

// Served via: POST /api/contests/pay-demo/complete
exports.completeDemoPayment = async (req, res) => {
    const { participationId, status } = req.body;

    if (status === 'SUCCESS') {
        const participation = await ContestParticipation.findById(participationId);
        if (participation) {
            participation.isPaid = true;
            participation.paidAt = new Date();
            participation.status = 'REGISTERED';
            // We use the participationId as paymentId in this demo flow if needed, or we check if there's a paymentId field
            // The logic in register used a uuid for paymentId, but let's lookup by _id if passed, or paymentId?
            // The URL param was "participationId". Let's assume it is the _id.

            await participation.save();
            await Contest.findByIdAndUpdate(participation.contestId, { $inc: { totalParticipants: 1 } });
        }
    }

    // Redirect back to App
    // Since we don't know the exact port of the frontend if it varies, 
    // we can try a few standard ones or just a success page.
    // Ideally: http://localhost:<frontend_port>/#/payment-success
    // We will redirect to a Success Page that attempts to window.close() or redirect to app scheme.

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment ${status}</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { text-align: center; font-family: sans-serif; padding-top: 50px; }
        h1 { color: ${status === 'SUCCESS' ? '#4caf50' : '#f44336'}; }
        p { font-size: 18px; }
        .btn { display: inline-block; padding: 10px 20px; background: #5865F2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;}
      </style>
      <script>
         // Try to redirect back to app if possible
         // For localhost chrome, manually clicking link is best.
      </script>
    </head>
    <body>
        <h1>Payment ${status}</h1>
        <p>Your transaction has been processed.</p>
        <p>Please return to the IDT Events App.</p>
        <a href="javascript:window.close();" class="btn">Close Window</a>
    </body>
    </html>
    `;

    res.send(html);
};
