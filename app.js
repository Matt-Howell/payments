const stripe = require('stripe')(process.env.stripe_sk);
const express = require('express');

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://besbxynuobcnqfdqexic.supabase.co', process.env.sb_sk, {
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
  res.set('Access-Control-Allow-Origin', 'https://keywordcatcher.com')
  // response.set('Access-Control-Allow-Origin', 'http://localhost:3000')
  let { data: data, error } = await supabase
  .from('customers')
  .select(`customer_id`)
  .eq('user_id', String(req.body.userId))

  if (data.length > 0 && !error) {
    console.log(data)
    const customer = data[0]["customer_id"]
    const session = await stripe.checkout.sessions.create({
      line_items: [{price: req.body.priceId, quantity:1}],
      mode: 'payment',
      allow_promotion_codes: true,
      customer,
      success_url: `${YOUR_DOMAIN}/app`,
      cancel_url: `${YOUR_DOMAIN}/app`,
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
      success_url: `${YOUR_DOMAIN}/app`,
      cancel_url: `${YOUR_DOMAIN}/app`,
      metadata:{pi:req.body.priceId}
    });

    res.redirect(303, session.url);
  }

});

const endpointSecret = 'whsec_KpRGGMcdwq2DaJauPA3QNv1mOwnRjMy3';

app.post('/webhook', express.raw({type: 'application/json'}), async (request, response) => {
  // response.set('Access-Control-Allow-Origin', 'https://keywordcatcher.com')
  // response.set('Access-Control-Allow-Origin', 'http://localhost:3000')
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

    if (customers){
      const { data: user, error } = await supabase.auth.admin.getUserById(
        customers[0]["user_id"]
      )
      if (user) {
        let credsToAdd = session.metadata.pi == "price_1MxarHDhsdMYodsiUbdm6yWo" ? 50000 : session.metadata.pi == "price_1MxapADhsdMYodsi3DpuxS2R" ? 10000 : session.metadata.pi == "price_1MxanUDhsdMYodsi9w3hiFQp" ? 1500 : 0
        const { data: updatedUser, errorUpdated } = await supabase.auth.admin.updateUserById(
          customers[0]["user_id"],
          { user_metadata: { credits: user.user.user_metadata.credits + credsToAdd } }
        )
      }
    }
  }

  response.sendStatus(200);
});

app.get('/history', async (request, response) => {
  response.set('Access-Control-Allow-Origin', 'https://keywordcatcher.com')
  // response.set('Access-Control-Allow-Origin', 'http://localhost:3000')

  const paymentIntents = await stripe.paymentIntents.list({
    limit: 10,
    customer: request.query.customer
  });

  console.log(request.query.customer, paymentIntents)

  let successful = []
  paymentIntents.data.map((payment) => {
    if (payment.status == "succeeded"){
      successful.push([`${String(new Date(payment.created*1000).getDate())}${String(new Date(payment.created*1000).getDate()).endsWith(1) ? "st" : String(new Date(payment.created*1000).getDate()).endsWith(2) ? "nd" : String(new Date(payment.created*1000).getDate()).endsWith(3) ? "rd" : "th"} ${new Date(payment.created*1000).toDateString().substring(4, 7)}, ${new Date(payment.created*1000).getFullYear()}`, (payment.amount / 100), (payment.metadata.pi == "price_1MxanUDhsdMYodsi9w3hiFQp" ? "1,500" : payment.metadata.pi == "price_1MxapADhsdMYodsi3DpuxS2R" ? "10,000" : "50,000")])
    }
  })

  response.send(successful)
});

app.listen(8080, () => console.log('Running on port 8080'));
