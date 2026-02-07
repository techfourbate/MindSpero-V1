import supabaseAdmin from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan } = req.body;
  const user = req.headers['x-user-id'];
  const authHeader = req.headers.authorization;

  if (!authHeader || !plan || !['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ error: 'Missing or invalid parameters' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(
      token.split('.')[1]
    );

    if (authError || !authUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const amount = plan === 'monthly' ? 3000 : 30000;
    const email = authUser.email;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        metadata: {
          plan,
          userId: authUser.id,
        },
      }),
    });

    const paystackData = await paystackRes.json();

    if (!paystackData.status) {
      return res.status(400).json({ error: paystackData.message });
    }

    return res.status(200).json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
