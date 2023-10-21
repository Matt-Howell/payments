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

app.post('/webhook', async (request, response) => {
  paypal.notification.webhookEvent.getAndVerify(request.body, function (error, response) {
    if (error) {
        console.log(error);
        throw error;
    } else {
        console.log(response);
    }
  });
});

app.listen(8080, () => console.log('Running on port 8080'));
