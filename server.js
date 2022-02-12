//dotenv per mantenere segreti i token di accesso
const result = require('dotenv').config({ path: `${__dirname}/.env` })

const express = require('express');
const app = express();
const cors = require('cors');

//Twit per la gestione delle API di Twitter v1
const Twit = require('twit');
//twitter-api-v2 per la gestione delle API di Twitter v2 e la stream
const { TwitterApi, ETwitterStreamEvent, TweetStream, ETwitterApiError } = require('twitter-api-v2');
//multilang-sentiment per la sentiment analysis
var sentiment = require('multilang-sentiment');
//langdetect per il riconoscimento della lingua deii tweet
var langdetect = require('langdetect');
//date-and-time per la gestione delle date
const date_time = require('date-and-time');
//Server per l'applicazione e per la stream
let httpServer = require("http").createServer(app);
//xmlhttprequest per richieste http
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
//path per i percorsi dei file
const path = require('path');
//socket.io per far arrivare al front-end i tweet della stream
const Server = require("socket.io");
const io = require("socket.io")(httpServer, { cors: { origin: "*" } })
//nodemailer per inviare mail tramite smtp
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport('smtps://' + process.env.MAIL + ':' + process.env.MAIL_PSW + '@smtp.gmail.com');

//stream è dichiarato globale per ragioni di scope
var stream = '';

app.use('/', express.static(__dirname + '/'));
app.use(cors());

//Token di autenticazione per le API di Twitter
const b_token = process.env.BEARER_TOKEN;

var T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
})


//Istanzio client per twitter API
const twitterClient = new TwitterApi(b_token);
const client = twitterClient.readOnly;
//Client con bearer token academic research
const twitterClientPRO = new TwitterApi(process.env.PRO_BEARER_TOKEN);
const clientPRO = twitterClientPRO.readOnly;

app.use(express.json());

/*FUNZIONI*/
//Funzione per inviare una mail parametrizzata
async function sendmail(from, to, subj, text, html) {
  var mailOptions = {
    from: `'${from} <${process.env.MAIL}>'`, // sender address
    to: `${to}`, // list of receivers
    subject: `${subj}`, // Subject line
    text: `${text}`, // plaintext body
    html: `${html}` // html body
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      return console.log("ERROR IN MAIL", error);
    }
    console.log('Message sent: ' + info.response);
  });
}

//Funzione per embed di tweet
async function embedTweet(id) {
  const tweet = await client.v1.oembedTweet(id);
  return tweet.html;
}

//Dato un author id restituisce l'username dell'autore corrispondente
async function getauthor(author_id) {
  let author = '';
  try {
    author = await client.v2.user(author_id);
  }
  catch (error) {
    console.log("ERROR IN GET AUTHOR", error);
  }
  return author.data.username;
}

//Dato un place id restituisce nome e coordinate corrispondenti
async function getGeo(place_id) {
  let place = '';
  try {
    place = await client.v1.geoPlace(place_id);
  }
  catch (error) {
    console.log("ERROR IN GET GEO", error);
  }

  return { 'Name': place.full_name, 'coord_center': place.contained_within[0].centroid };
}

/*Dato un array di coordinate trova il centro*/
function find_medium(coordinates) {
  let sumX = 0;
  let sumY = 0;
  for (let coord of coordinates) {
    sumX += coord[0];
    sumY += coord[1];
  }
  let mediaX = sumX / coordinates.length;
  let mediaY = sumY / coordinates.length;

  return [mediaX, mediaY];
}

//Funzione di sentiment analysis
async function sentiment_analyze(toAnalyze) {
  let tweet_eval = { 'eval': [] };
  try {
    //Rimuovo '@' e '#' perchè impediscono una corretta indivduazione della lingua
    const regExHash = new RegExp('#', "g");
    const regExTag = new RegExp('@', "g");
    let notag = toAnalyze.replace(regExHash, '');
    let replaced = notag.replace(regExTag, '');

    //Riconosco la lingua in cui è scritto il tweet (se non riconosciuta ritorna null e ignora il tweet)
    var lang = langdetect.detectOne(replaced);
    let ParsedTweet = await sentiment(replaced, lang);

    //Inserisco i dati dell'analisi sul tweet
    tweet_eval.eval.push({
      "Score": ParsedTweet['score'], //Punteggio assegnato
      "TotL": ParsedTweet['tokens'].length, //Lunghezza del tweet
      "Pos": ParsedTweet['positive'], //Array di parole identificate come positive
      "PosL": ParsedTweet['positive'].length,
      "Neg": ParsedTweet['negative'], //Array di parole identificate come negative
      "NegL": ParsedTweet['negative'].length
    });
  }
  catch (e) {
    //In caso di errori (es. tweet non significativi contenenti solo un tag), inserisco i dati a mano
    //Inserimento di sicurezza dato che per ora l'unico errore è stata la lingua non identificata (Legge di Murphy)
    tweet_eval.eval.push({
      "Score": 0,
      "TotL": 0,
      "Pos": 0,
      "PosL": 0,
      "Neg": 0,
      "NegL": 0
    });
  }
  return (tweet_eval);
}

//Funzione per cancellare tutte le rules per le stream
async function delete_rules() {
  let rules = '';
  let idArray = [];
  try {
    rules = await client.v2.streamRules();

    for (let rule of rules.data) {
      idArray.push(rule.id);
    }

    await client.v2.updateStreamRules({
      delete: {
        ids: idArray
      }
    });
  }
  catch (e) {
    console.log("ERROR IN DELETE RULE: ", e);
  }
}

//Funzione che dato un luogo ne restituisce le coordinate (API openstreetmap)
async function getPlace(place) {
  var xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.onreadystatechange = (e) => {
      if (xhr.readyState !== 4) {
        return;
      }

      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        console.warn('request_error');
      }
    };

    xhr.open('GET', "https://nominatim.openstreetmap.org/search?format=json&q=%27" + place);
    xhr.send();
  });
}

/*API*/
//API v2 che dato uno username restituisce la timeline dei suoi Tweets
app.get('/users/:name', async (req, res) => {
  let userID = '';
  //Dato un nome trovo l'ID
  try {
    userID = await client.v2.userByUsername(req.params.name);
    if (userID.data == undefined) {
      res.status(404).json("Errore: utente non trovato");
      return;
    }
  }
  catch (error) {
    console.log("ERROR IN USER BY USERNAME: ", error);
  }
  //Numero dei risultati che si vogliono ottenere (predisposizione per passaggio con parametro)
  let results = req.query.numtweets == undefined ? 25 : req.query.numtweets;

  if (results < 5) {
    results = 5;
  }
  else if (results > 100) {
    results = 100;
  }

  let userTweets = '';
  //Utilizzo l'ID trovato prima per ottenere la user timeline
  try {
    userTweets = await client.v2.userTimeline(userID.data.id, { 'max_results': results, 'expansions': 'geo.place_id', 'tweet.fields': 'created_at' });
    if (userTweets._realData.data == undefined) {
      res.status(404).json("Questo utente non ha mai twittato")
      return;
    }
  }
  catch (error) {
    res.status(404).json(error);
  }

  let dates = [];
  let timeline = { 'tweets': [] };
  let geo = null;
  //Scorro tutti i tweets
  for (let singletweet of userTweets._realData.data) {
    //geo torna null in modo da non conservarne il valore
    geo = null;
    try {
      //Se il tweet è geolocalizzato ottengo dei dati riguardanti il luogo
      if (singletweet.geo != null) {
        geo = await getGeo(singletweet.geo.place_id)
      }
      //Creo la risposta
      timeline.tweets.push({
        "Text": singletweet.text,
        "geo": geo,
        "id": singletweet.id
      })

      //Creo array delle date di creazione dei Tweet
      let formattedDate = singletweet.created_at.substring(0, 10);
      //Se la data non è mai stata inserita la inserisco
      var checkinserted = (element) => element.Date == formattedDate;
      if (!dates.some(checkinserted)) {
        dates.push({
          "Date": formattedDate,
          "Times": 1
        })
      }
      //Altrimenti aggiorno il contatore delle occorrenze
      else {
        for (let date of dates) {
          if (date.Date == formattedDate) {
            date.Times = date.Times + 1;
          }
        }
      }
    }
    catch (e) {
      console.log("ERROR IN TIMELINE: ", e);
    }
  }
  res.status(200).json({ timeline, "Occurrencies": dates });
});

/*Tweet vicini a coordinata*/
app.get('/geo/:place', (req, res) => {
  try {
    //Ottengo latitudine e longitudine dal parametro della richiesta
    let coord = req.params.place.split("x");
    //Inizializzo i default dei parametri
    let radius = req.query.radius == undefined ? ',10mi' : ',' + req.query.radius + 'mi';
    let georeq = coord[0] + ',' + coord[1] + radius;

    T.get('search/tweets', { q: 'since:2020-01-01', geocode: georeq, count: 30, result_type: 'recent' }, async (err2, data2) => {

      if (data2["statuses"].length == 0) {
        res.status(400).json("Nessun tweet trovato")
        return;
      }
      //Preparazione della risposta
      for (let data of data2['statuses']) {
        if (data['place'] == null) {
          data['geo'] = { 'coord_center': [] };
          data['geo']['coord_center'][1] = parseFloat(coord[0]) + Math.random() * (0.005);
          data['geo']['coord_center'][0] = parseFloat(coord[1]) + Math.random() * (0.005);
        }
        else {
          let my_coord = find_medium(data['place']['bounding_box']['coordinates'][0]);
          data['geo'] = { 'coord_center': [] };
          data['geo']['coord_center'][1] = my_coord[1] + Math.random() * (0.005);
          data['geo']['coord_center'][0] = my_coord[0] + Math.random() * (0.005);
        }
        data['Author'] = data['id'];
        data['Text'] = data['text'];
      }
      data2['tweets'] = data2['statuses'];
      res.status(200).json(data2);
    })
  }
  catch {
    res.status(404).json("error");
  }
})

//Trova i tweet contententi la stringa data
app.get('/recents/:word', async (req, res) => {
  let tweet = '';
  //Numero dei risultati che si vogliono ottenere (predisposizione per passaggio con parametro)
  let results = req.query.numtweets == undefined ? 25 : req.query.numtweets;

  if (results < 10) {
    results = 10;
  }
  else if (results > 100) {
    results = 100;
  }

  let query = req.params.word;
  let notcontain = req.query.notcontain == undefined ? [] : req.query.notcontain.split(",");

  if (notcontain.includes(query)) {
    res.status(400).json("Impossibile escludere la stringa cercata");
    return;
  }

  let hasmedia = req.query.hasmedia == undefined ? 'false' : req.query.hasmedia;
  let isverified = req.query.verified == undefined ? 'false' : req.query.verified;

  //Se cerco un hashtag o uno user i relativi simboli devono essere codificati
  if (query[0] == '~') { //~ perchè è così che arrivano le richieste dato che # è un carattere vietato
    query = '#' + req.params.word.substring(1);
  }
  else if (query[0] == '@') {
    query = '@' + req.params.word.substring(1);
  }

  if (notcontain[0] != '') {
    for (let onenot of notcontain)
      query = query + " -" + onenot;
  }

  if (hasmedia != 'false')
    query = query + " -has:media -has:links"

  if (isverified != 'false')
    query = query + " is:verified"

  //Se true la sentiment analysis è richiesta
  let toSentiment = req.query.sentiment;

  try {
    //Trovo i tweets
    tweet = await clientPRO.v2.searchAll(query, { 'max_results': results, 'expansions': ['geo.place_id', 'author_id'] });

    if (tweet._realData == undefined) {
      res.status(404).json("Nessun tweet trovato")
      return;
    }

    if (tweet._realData.data == undefined) {
      res.status(404).json("Nessun tweet trovato")
      return;
    }

  }
  catch (error) {
    res.status(404).json(error);
    return;
  }

  //Tweet da analizzare
  let toAnalyze = tweet._realData.data;
  if (toAnalyze != undefined) {
    //Numero di risultati
    let resnum = toAnalyze.length;
    //Variabili inizializzate (motivi di scope)
    let sentiment_result = null;
    let geo = null;
    let tweets = { 'info': [] };
    let totscore = null;
    let totwords = 0;
    let totpos = 0;
    let totneg = 0;

    if (toAnalyze != null) {
      for (let singletweet of toAnalyze) {
        //geo torna null perchè non mantenga il valore
        geo = null;
        try {
          //Se il tweet è geolocalizzato
          if (singletweet['geo'] != null) {
            //Ottengo le informazioni riguardanti il posto
            geo = await getGeo(singletweet['geo']['place_id']);
          }

          if (toSentiment == "true") {
            //Eseguo la sentimenttaiga
            sentiment_result = await sentiment_analyze(singletweet['text']);
            totscore += parseFloat(sentiment_result.eval[0].Score);
            totwords += parseFloat(sentiment_result.eval[0].TotL);
            totpos += parseFloat(sentiment_result.eval[0].PosL);
            totneg += parseFloat(sentiment_result.eval[0].NegL);
          }
          tweets.info.push({
            "Author": singletweet['author_id'],
            "Text": singletweet['text'],
            "Lang": langdetect.detectOne(singletweet['text']),
            "geo": geo,
            "sentiment": sentiment_result,
            "id": singletweet.id
          })
        }
        catch (e) {
          //In caso di errori (es. lingua sconosciuta) diminuisco il numero di risultati
          resnum--;
          console.log("ERROR IN RECENTS: ", e);
        }
      }
    }
    else {
      res.status(404).json("No tweets found")
    }

    //Se dovevo fare sentiment analysis calcolo la media degli score, altrimenti metto null (null/int = 0)
    totscore = totscore / results;
    if (toSentiment != "true") {
      totscore = null;
      totwords = null;
      totpos = null;
      totneg = null;
    }
    //Creo e restituisco la risposta
    let counters = { "avg": totscore, "Tot_words": totwords, "Tot_pos": totpos, "Tot_neg": totneg }
    let data = tweets.info;
    let ans = { 'Tot_tweets': resnum, 'analysis_data': counters, data };
    res.status(200).json(ans);
  }
  else {
    res.status(404).json("Not Found");
  }
});

//API per lo streaming dei tweet di emergenza
//Chiude lo streaming, se ce ne è uno aperto
app.get('/stream/closing', async (req, res) => {
  try { stream.close(); res.status(200).json("Closed") } catch { res.status(401).json("Closed too soon") }
})

//Avvia la stream dei tweet di emergenza (contententi parole associate alle emergenze)
app.get('/stream/tweets', async (req, res) => {
  //All'inizio prova a chiudere eventuali stream aperte
  try {
    stream.close()
  }
  catch {
    console.log("No already opened stream found")
  }

  try {
    //await delete_rules();

    //Aggiunge le regole
    await client.v2.updateStreamRules({
      add: [
        { value: 'SOSigsw10', tag: 'SOS' },
        { value: 'Incendio', tag: 'inc' },
        { value: 'Terremoto', tag: 'ter' },
        { value: 'Eruzione', tag: 'eru' },
        { value: 'Alluvione', tag: 'all' },
        { value: 'Tempesta', tag: 'tem' },
        { value: 'Uragano', tag: 'ura' }
      ],
    });

    //Avvia la streaming
    stream = await client.v2.searchStream({ 'expansions': ['geo.place_id', 'author_id'] });

    //GESTORI DEGLI EVENTI DELLA STREAM
    // Awaits for a tweet
    stream.on(
      // Emitted when Node.js {response} emits a 'error' event (contains its payload).
      ETwitterStreamEvent.ConnectionError,
      err => console.log('Connection error!', err),
    );

    stream.on(
      // Emitted when Node.js {response} is closed by remote or using .close().
      ETwitterStreamEvent.ConnectionClosed,
      () => console.log('Connection has been closed.'),
    );

    stream.on(
      // Emitted when a Twitter sent a signal to maintain connection active
      ETwitterStreamEvent.DataKeepAlive,
      () => console.log('Twitter has a keep-alive packet.'),
    );

    var emergencytweets = [];
    stream.on(
      // Emitted when a Twitter payload (a tweet or not, given the endpoint).
      ETwitterStreamEvent.Data,
      async eventData => {
        //Emetto evento con socket.io per front-end
        await io.emit('tweet', eventData);
        //Se il tweet è geolocalizzato
        if (eventData.data.geo.place_id != undefined) {
          //Inizializzo i campi
          let author = eventData.includes.users[0]
          let location = eventData.includes.places
          let placecoords = ''
          await getPlace(location[0].full_name).then(resp => placecoords = resp);

          //Se è stato usato l'hashtag d'emergenza invio subito una mail
          if (eventData.data.text.includes("SOSigsw10")) {
            var html = `L'hashtag #SOSigsw10 è stato utilizzato! <hr>
              <p> L'autore del Tweet è l'utente ${author.username}, con id: ${author.id} <\p>
              <p>Il testo del tweet è: ${eventData.data.text} <\p>
              <p>Nel seguente luogo: ${location[0].full_name} <\p>
              <p>Presso le coordinate: ${placecoords[0].lat}, ${placecoords[0].lon}<\p> <hr>
              Questa è una mail inviata automaticamente da TwittEarth `

            sendmail("ET", "team10igsw2021@gmail.com", "Prova", "Prova invio mail", html);
          }
          else {
            emergencytweets.push({
              "geo": location[0].full_name,
              "lat": placecoords[0].lat,
              "lon": placecoords[0].lon,
              "author": author.username,
              "auth_id": author.id,
              "text": eventData.data.text
            });
            console.log("ET: ", emergencytweets)
            //Se ho 5 tweet con parole associate alle emergenze
            if (emergencytweets.length == 5) {
              let removed = false;
              for (var i = 0; i < emergencytweets.length; i++) {
                //Prendo come riferimento il primo per le coordinate
                if ((Math.abs(emergencytweets[0].lat - emergencytweets[i].lat) > 1) ||
                  (Math.abs(emergencytweets[0].lon - emergencytweets[i].lon) > 1)) {
                  removed = true;
                  //Se i tweet sono lontani dal primo li rimuovo
                  emergencytweets.splice(i, 1);
                }
              }
              if (!removed) {
                //Se non ho rimosso tweets significa che sono tutti vicini, quindi invio la mail
                var EHtml = `Cinque tweet contenenti parole inerenti le emergenze sono stati scritti! <hr>`

                for (let ET of emergencytweets) {
                  EHtml = EHtml + `<p> Dall'utente: ${ET.author}, con id: ${ET.auth_id}<\p>
                    <p>Con scritto: ${ET.text}<\p>
                    <p>Presso: ${ET.geo}, con coordinate: ${ET.lat}, ${ET.lon}<\p> <hr>`
                }
                EHtml = EHtml + `Questa è una mail inviata automaticamente da TwittEarth`
                sendmail("ET", "team10igsw2021@gmail.com", "Prova", "Prova invio mail", EHtml);
                emergencytweets = [];
              }
            }
          }
        }
      }
    );

    // Enable reconnect feature
    stream.autoReconnect = true;
  }
  catch (e) {
    console.log("ERROR IN STREAM: ", e);
    res.status(404).json(e);
  }

  let percorso = path.resolve(__dirname, 'stream.html')
  res.sendFile(percorso);

  io.on("connection", (socket) => {
    console.log('IO connected...')
  });

});

//API per trivia tramite poll
app.get('/poll/:pollTag', async (req, res) => {
  var PollTweets = '';
  try {
    let query = req.params.pollTag;

    //Se cerco un hashtag o uno user i relativi simboli devono essere codificati
    if (query[0] == '~') { //~ perchè è così che arrivano le richieste dato che # è un carattere vietato
      query = '#' + req.params.pollTag.substring(1);
    }
    else {
      query = '#' + query;
    }

    //Cerco i tweet con poll contententi l'hashtag del trivia e li aggiungo alla risposta
    PollTweets = await client.v2.search(query, { 'expansions': ['attachments.poll_ids', 'author_id'], 'poll.fields': 'duration_minutes,end_datetime,id,options,voting_status' });
    var polls = [];
    var singlepoll = '';
    for (let poll of PollTweets._realData.data) {
      try {
        if (poll.attachments.poll_ids != undefined) {
          for (let included of PollTweets._realData.includes.polls) {
            if (included.id == poll.attachments.poll_ids) {
              singlepoll = included;
              polls.push({
                "Text": poll.text,
                "id": poll.id,
                "Poll": singlepoll,
                "Correct": null
              });
            }
          }
        }
      }
      catch (error) {
        console.log("ERROR IN POLL: ", error);
      }
    }
  }
  catch (e) {
    console.log("ERROR IN POLL: ", e)
    res.status(404).json("Errore");
    return;
  }

  //Cerco il tweet che rivela le risposte corrette e le aggiungo alla risposta
  var answ = '';
  try {

    let queryans = '#risposta' + req.params.pollTag.replace("~", "")
    answ = await client.v2.search(queryans, { 'expansions': 'author_id' });

    if (answ._realData.data[0] != undefined) {
      //Elimino # risposta + ottengo singole risposte + le metto nell'ordine giusto
      let risposte = answ._realData.data[0].text.substring(queryans.length).split(",").reverse();

      for (var i = 0; i < polls.length; i++) {
        polls[i].Correct = parseInt(risposte[i]);
      }
    }
  }
  catch (e) {
    //console.log("ERROR IN FINDING ANSWERS: ", e)
  }

  res.status(200).json(polls);
})

//API per concorso letterario
app.get('/concorso/:tagConcorso', async (req, res) => {
  var Bandoconcorso = '';
  var Partecipanti = '';
  var Voters = '';
  var votato = [];

  var concorso = { 'bando': [], 'partecipanti': [], 'votanti': [], 'results': [] }

  try {
    let query = req.params.tagConcorso;

    //Se cerco un hashtag o uno user i relativi simboli devono essere codificati
    if (query[0] == '~') { //~ perchè è così che arrivano le richieste dato che # è un carattere vietato
      query = req.params.tagConcorso.substring(1);
    }
    //Cerco il tweet che bandisce il concorso
    Bandoconcorso = await client.v2.search('#' + 'bandiscoconcorso' + query, { 'max_results': 100, 'expansions': 'author_id', 'tweet.fields': 'created_at' });

    var dataBando = new Date(Bandoconcorso._realData.data[0].created_at);
    var duration = 60;
    if (Bandoconcorso._realData.data == undefined) {
      res.status(404).json("Nessun tweet trovato")
      return;
    }

    concorso.bando.push({
      "Text": Bandoconcorso._realData.data[0].text,
      "Banditore": Bandoconcorso._realData.includes.users[0].username
    });

    //Cerco tutti quelli che si sono iscritti al concorso tramite hashtag in tempo utile
    Partecipanti = await client.v2.search('#' + 'partecipoconcorso' + query, { 'max_results': 100, 'expansions': 'author_id', 'tweet.fields': 'created_at' });

    if (Partecipanti._realData.data == undefined) {
      res.status(200).json(concorso);
      return;
    }

    const regExSpace = new RegExp(' ', "g");
    for (let user of Partecipanti._realData.data) {
      if (date_time.subtract(new Date(user.created_at), dataBando).toDays() < duration) {
        concorso.partecipanti.push(user.text.replace('#' + 'partecipoconcorso' + query, "").trim().replace(regExSpace, "_").toLowerCase())
      }
    }

    //Cerco i tweet di chi ha votato libri partecipanti tramite hashtag, in tempo utile
    Voters = await client.v2.search('#' + 'votoconcorso' + query, { 'max_results': 100, 'expansions': 'author_id', 'tweet.fields': 'created_at' });

    if (Voters._realData.data == undefined) {
      res.status(200).json(concorso);
      return;
    }

    for (let voter of Voters._realData.data) {
      let voto = voter.text.replace('#' + 'votoconcorso' + query, "").trim().replace(regExSpace, "_").toLowerCase()
      var checkpartecipa = (element) => element == voto;
      var checkvoted = (element) => element == voter.author_id;

      if (date_time.subtract(new Date(voter.created_at), dataBando).toDays() < duration) {
        if (concorso.partecipanti.some(checkpartecipa)) {
          if (!votato.some(checkvoted)) {
            concorso.votanti.push({
              "Voto": voto,
              "ID": voter.author_id
            })
          }
        }
        else {
          console.log(voto + " non partecipa")
        }
        var checkvotanti = concorso.votanti.filter(elem => elem.ID == voter.author_id);

        //Controllo che ognuno voti massimo 10 volte, i voti extra annullano i primi in ordine cronologico
        if (checkvotanti.length > 9) {
          if (!votato.some(checkvoted)) {
            votato.push(voter.author_id);
          }
        }
      }
      else {
        console.log("Voto fuori tempo massimo")
      }
    }

    //Creo il report libri - numero di voti
    for (let part of concorso.partecipanti) {
      var contavoti = concorso.votanti.filter(elem => elem.Voto == part);
      concorso.results.push({
        "Partecipante": part,
        "Voti": contavoti.length
      })
    }
  }
  catch (e) {
    console.log("ERRORE NEL CONCORSO: ", e)
  }

  res.status(200).json(concorso);

})

module.exports.httpServer = httpServer;
