const stripe = require('stripe')('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');
const express = require('express');

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://besbxynuobcnqfdqexic.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlc2J4eW51b2JjbnFmZHFleGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3NzU4MzM5NywiZXhwIjoxOTkzMTU5Mzk3fQ.LdAzK9mbZpoO0Lz5Ep9p-1XzlvQxybr8pv5GNO7SsKc', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const app = express();

app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.urlencoded({ extended:true })(req, res, next);
  }
});

const YOUR_DOMAIN = 'https://keywordcatcher.com';

app.post('/create-checkout', async (req, res) => {  
  let { data: data, error } = await supabase
  .from('customers')
  .select(`customer_id`)
  .eq('user_id', String(req.body.userId))

  if (data.length > 0 && !error) {
    const customer = data[0]["customer_email"]
    const session = await stripe.checkout.sessions.create({
      line_items: [{price: req.body.priceId, quantity:1}],
      mode: 'payment',
      allow_promotion_codes: true,
      customer,
      success_url: `https://beta.${YOUR_DOMAIN}/`,
      cancel_url: `https://beta.${YOUR_DOMAIN}/`,
      metadata:{pi:req.body.priceId}
    });

    res.redirect(303, session.url);
  } else {
    const customerBody = await stripe.customers.create({
      email: req.body.userEmail,
      metadata: { supabaseUUID: req.body.userId }
    });

    let { data: data, error } = await supabase
    .from('customers')
    .insert([
      { user_id: String(req.body.userId), customer_email: String(req.body.userEmail), customer_id: String(customerBody.id) },
    ])

    if(error) return;

    const customer = customerBody.id;
    const session = await stripe.checkout.sessions.create({
      line_items: [{price: req.body.priceId, quantity:1}],
      mode: 'payment',
      allow_promotion_codes: true,
      customer,
      success_url: `https://beta.${YOUR_DOMAIN}/`,
      cancel_url: `https://beta.${YOUR_DOMAIN}/`,
      metadata:{pi:req.body.priceId}
    });

    res.redirect(303, session.url);
  }

});

const endpointSecret = 'whsec_KpRGGMcdwq2DaJauPA3QNv1mOwnRjMy3';

app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const { data: customers, error } = await supabase
    .from('customers')
    .select(`user_id, customer_email`)
    .eq('customer_id', String(session.customer))

    if (stripeCustomers){
      const { data: user, error } = await supabase.auth.admin.getUserById(
        customers[0]["cusId"]
      )
      if (user) {
        let credsToAdd = session.metadata.pi == "price_1MxarHDhsdMYodsiUbdm6yWo" ? 50000 : session.metadata.pi == "price_1MxapADhsdMYodsi3DpuxS2R" ? 10000 : session.metadata.pi == "price_1MxanUDhsdMYodsi9w3hiFQp" ? 1500 : 0
        const { data: updatedUser, errorUpdated } = await supabase.auth.admin.updateUserById(
          customers[0]["cusId"],
            { user_metadata: { credits: user.user.user_metadata.credits + credsToAdd } }
        )
      }
    }
  }

  response.sendStatus(200);
});

app.listen(8080, () => console.log('Running on port 8080'));