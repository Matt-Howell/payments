const express = require('express');
const paypal = require('paypal-rest-sdk');
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://besbxynuobcnqfdqexic.supabase.co', process.env.sb_sk, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const app = express();

app.use(express.json());

paypal.configure({
  'mode': 'live',
  'client_id': 'ATcPig8Sy-Mukb-v4gjRV6m4CWehRsjdOAvk1N_noQolt9j_IsKv-ridyROK6Mtma4SFfxwMrapjS5h1',
  'client_secret': process.env.pp_sk
});


app.get('/add-credits', async (request, response) => {
  response.set('Access-Control-Allow-Origin', 'https://app.keywordcatcher.com')
  //response.set('Access-Control-Allow-Origin', 'http://localhost:3000')

  let toAdd = request.query.number
  let userEmail = request.query.email

  const { data: { users }, error: errorB } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  })

  let userID = users.filter(u => u.email == userEmail)[0].id

  const { data: userA, error: errorA } = await supabase.auth.admin.getUserById(
    userID
  )

  const { data: user, error } = await supabase.auth.admin.updateUserById(
    userID,
    { user_metadata: { credits: parseInt(userA.user.user_metadata.credits + parseInt(toAdd)) } }
  )

  response.send({credits:user.user.user_metadata.credits})
});

app.get('/get-users', async (request, response) => {
  response.set('Access-Control-Allow-Origin', 'https://app.keywordcatcher.com')
  // response.set('Access-Control-Allow-Origin', 'http://localhost:3000')

  let type = request.query.type

  const { data: { users }, error: errorB } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  })

  let resultSend = []
 
  if (type == "all") {
    resultSend = [...users]
  } else {
    resultSend = [...users.filter(u => u.user_metadata.credits > 150)]
  }

  response.send(resultSend)
});

app.post('/webhook', async (req, res) => {
  paypal.notification.webhookEvent.getAndVerify(request.body, async function (error, response) {
    if (error) {
        console.log(error);
        throw error;
    } else {
      const id = response.id;
      const type = response.event_type;
      const content = response.resource;

      switch (type) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          const subscriptionId = content.id;
          const planId = content.plan_id;
          const startTime = content.start_time;
          const status = content.status;
          switch (planId) {
            case "P-98T28371NP590762EMUD7DTA":
              await supabase
              .from('subscribed')
              .upsert({user: subscriptionId, type:"1500", schedule:startTime})
              break;
            case "P-7CA06431ME326415CMUD7ESY":
              await supabase
              .from('subscribed')
              .upsert({user: subscriptionId, type:"10000", schedule:startTime})
              break;
            case "P-5SA08344YN3918458MUD7FPI":
              await supabase
              .from('subscribed')
              .upsert({user: subscriptionId, type:"50000", schedule:startTime})
              break;
            default:
              break;
          }
          break;
        case 'BILLING.SUBSCRIPTION.CANCELLED':  
          const CancelledsubscriptionId = content.id;
          const cancellationTime = content.status_change_note.effective_time;
          await supabase
          .from('subscribed')
          .delete()
          .eq("user", CancelledsubscriptionId)
          break;
        default:
          console.log('Unhandled event type:', eventType);
      }
    
      res.status(200).end();
    }
  });
});

app.get('/redeem-code', async (request, response) => {
  response.set('Access-Control-Allow-Origin', 'https://app.keywordcatcher.com')
  const code = request.query.code

  const { data, error } = await supabase
  .from('ascodes')
  .select("*")
  .eq("code", code)
  .eq("redeemed", "FALSE")

  if (data.length < 1) {
    response.status(400).send({valid:false})
  } else {
    await supabase
    .from('ascodes')
    .update({redeemed:"TRUE"})
    .eq("code", code)

    let userID = request.query.user

    const { data: selectedUser } = await supabase
    .from('subscribed')
    .select("*")
    .eq("user", userID)

    if (selectedUser.length < 1) {
      await supabase
      .from('subscribed')
      .insert({user: userID, type:"1500", schedule:new Date()})
      await supabase.auth.admin.updateUserById(
          userID,
          { user_metadata: { credits: 1500 } }
      )
    } else {
      switch (selectedUser[0].type) {
        case "1500":
          await supabase
          .from('subscribed')
          .update({type:"5000", schedule:new Date()})
          .eq("user", userID)  

          await supabase.auth.admin.updateUserById(
            userID,
            { user_metadata: { credits: 5000 } }
          )
          break;
        case "5000":
          await supabase
          .from('subscribed')
          .update({type:"10000", schedule:new Date()})
          .eq("user", userID)
          await supabase.auth.admin.updateUserById(
            userID,
            { user_metadata: { credits: 10000 } }
          )
          break;
        case "10000":
          await supabase
          .from('subscribed')
          .update({type:"15000", schedule:new Date()})
          .eq("user", userID)       
           await supabase.auth.admin.updateUserById(
            userID,
            { user_metadata: { credits: 15000 } }
          )
          break;
        case "15000":
          await supabase
          .from('subscribed')
          .update({type:"50000", schedule:new Date()})
          .eq("user", userID)
          await supabase.auth.admin.updateUserById(
            userID,
            { user_metadata: { credits: 50000 } }
          )
          break;
        default:
          break;
      }
    }

    response.status(200).send({valid:true})
  }
});

app.listen(8080, () => console.log('Running on port 8080'));
