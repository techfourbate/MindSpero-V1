import supabaseAdmin from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body;

  try {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          trial_start_date: new Date(),
          trial_end_date: trialEndDate,
          created_at: new Date(),
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
