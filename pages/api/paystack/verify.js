import supabaseAdmin from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'Missing reference' });
  }

  try {
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    const { userId, plan } = paystackData.data.metadata;

    const bonusTrialEnd = new Date();
    bonusTrialEnd.setDate(bonusTrialEnd.getDate() + 14);

    const subscriptionStart = new Date(bonusTrialEnd);
    const subscriptionEnd = new Date(subscriptionStart);
    if (plan === 'monthly') {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    } else {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        bonus_trial_end_date: bonusTrialEnd,
        subscription_plan: plan,
        subscription_end_date: subscriptionEnd,
      })
      .eq('id', userId)
      .select();

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated',
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
}
