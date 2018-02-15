const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => (req.url === '/') ? res.render('index') : res.render('.' + req.url) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
