import crypto from 'crypto';
import supabaseAdmin from '../../lib/supabaseAdmin';

export const config = {
  api: {
    bodyParser: {
      raw: true,
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-paystack-signature'];

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event not processed' });
    }

    const { data } = event;
    const { userId, plan } = data.metadata;

    const bonusTrialEnd = new Date();
    bonusTrialEnd.setDate(bonusTrialEnd.getDate() + 14);

    const subscriptionStart = new Date(bonusTrialEnd);
    const subscriptionEnd = new Date(subscriptionStart);
    if (plan === 'monthly') {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    } else {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        bonus_trial_end_date: bonusTrialEnd,
        subscription_plan: plan,
        subscription_end_date: subscriptionEnd,
      })
      .eq('id', userId);

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
