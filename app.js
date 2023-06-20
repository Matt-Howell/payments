const express = require('express');

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient('https://besbxynuobcnqfdqexic.supabase.co', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlc2J4eW51b2JjbnFmZHFleGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3NzU4MzM5NywiZXhwIjoxOTkzMTU5Mzk3fQ.LdAzK9mbZpoO0Lz5Ep9p-1XzlvQxybr8pv5GNO7SsKc", {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const app = express();

app.use(express.json());

app.get('/add-credits', async (request, response) => {
  response.set('Access-Control-Allow-Origin', 'https://keywordcatcher.com')
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
  response.set('Access-Control-Allow-Origin', 'https://keywordcatcher.com')
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

app.listen(8080, () => console.log('Running on port 8080'));