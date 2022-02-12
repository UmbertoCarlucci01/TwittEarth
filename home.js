var only_geo = false;
var sent_analyze = false;
var nomedia = false;
var veri = false;
var nocont = false;
var mymap = L.map('map').setView([0, 0], 2);

var SentimentChart = null;
var WordCloud = null;
var bookChart = null;
var bookChartTop = null;
const type = 'doughnut';

const imagesvg = '<svg version="1.1"  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 180 180" enable-background="new 0 0 180 180" xml:space="preserve"><path d="M124.6,90.1l4.2-0.3l0.1-4.3l4.2-0.9l-0.5-4.3l4.1-1.4l-1-4.2l3.9-1.9l-1.5-4l3.6-2.3l-2-3.8l3.3-2.8l-2.5-3.5l2.9-3.2l-2.9-3.2l2.5-3.5l-3.3-2.8l2-3.8l-3.6-2.4l1.5-4l-3.9-1.9l1-4.2l-4.1-1.4l0.5-4.3l-4.2-0.9l-0.1-4.3l-4.3-0.3l-0.6-4.3l-4.3,0.2l-1.1-4.2L114.4,9l-1.6-4l-4.1,1.3l-2.1-3.7l-3.9,1.8L100,0.8l-3.7,2.3l-3-3.1L90,2.7L86.7,0l-3,3.1L80,0.8l-2.6,3.4l-3.9-1.8l-2.1,3.7L67.3,5l-1.6,4l-4.2-0.8l-1.1,4.2L56,12.1l-0.6,4.3l-4.3,0.3L51.1,21l-4.2,0.9l0.5,4.3l-4.1,1.4l1,4.2l-3.9,1.9l1.5,4l-3.6,2.3l2,3.8l-3.3,2.8l2.5,3.5l-2.9,3.2l2.9,3.2l-2.5,3.5l3.3,2.8l-2,3.8l3.6,2.4l-1.5,4l3.9,1.9l-1,4.2l4.1,1.4l-0.5,4.3l4.2,0.9l0.1,4.3l4.3,0.3l-30.6,73.9l27.5-11.4L63.6,180L90,116.3l26.4,63.7l11.4-27.5l27.5,11.4L124.6,90.1z M90,18.9c19.1,0,34.5,15.5,34.5,34.6C124.5,72.5,109.1,88,90,88c-19.1,0-34.5-15.5-34.5-34.6C55.5,34.4,70.9,18.9,90,18.9z"/></svg>';

//var serverUrl = "http://localhost:8000/";
var serverUrl = "https://site202136.tw.cs.unibo.it/";

function resetFilters() {
  only_geo = false;
  sent_analyze = false;
  nomedia = false;
  veri = false;
  nocont = false;
}

async function ResetAllCharts() {
  ResetMap(mymap);
  ResetChart('#SentimentChartID');
  ResetChart('#WordCloudID');
  ResetChart('#booksChartID');
  ResetChart('#booksChartTopID');
  ResetChart('#locationChartID');
  ResetChart('#PollChartID');
  ResetChart('#userTimeID')
}


function closeStream() {
  $.ajax({
    type: 'GET',
    url: serverUrl + "stream/closing",
    crossDomain: true,
    success: function () {
      console.log("Closed");
    }
  })
}

function callStream() {
  $.ajax({
    type: 'GET',
    url: serverUrl + "stream/tweets",
    crossDomain: true,
    success: () => { console.log("Connected to Stream") }
  })
}

function changebar(choice) {
  return function () {
    function setValues(placeholder1, placeholder2, myfun, toDisable, toSearch, min) {
      document.getElementById('input-end').setAttribute('placeholder', 0);
      document.getElementById('searchbar').setAttribute('placeholder', placeholder1);
      document.getElementById('searchbar').value = "";
      document.getElementById('searchby').setAttribute('placeholder', placeholder2);
      document.getElementById('searchby').value = "";
      document.getElementById('simpleform').setAttribute('action', myfun);
      document.getElementById('searchhead').innerHTML = "Insert" + toSearch;
      document.getElementById('check_sent').disabled = toDisable;
      document.getElementById('check_sent').checked = false;
      document.getElementById('notcontain').disabled = toDisable;
      document.getElementById('notcontain').value = "";
      document.getElementById('containmedia').disabled = toDisable;
      document.getElementById('containmedia').checked = false;
      document.getElementById('verified').disabled = toDisable;
      document.getElementById('verified').checked = false;
      document.getElementById('check_geo').disabled = false;
      document.getElementById('check_geo').checked = false;
      only_geo = false;
      if (toSearch == " location") {
        document.getElementById('plusbutton').disabled = false;
        document.getElementById('minusbutton').disabled = false;
        document.getElementById('numtweets').disabled = false;
        document.getElementById('numtweets').value = min;
        document.getElementById('numtweets').setAttribute('value', min);
        document.getElementById('numtweets').min = "1";
        document.getElementById('numtweets').max = "500";
        document.getElementById('numtweetslabel').innerHTML = "Radius (in miles):";
      }
      else {
        if (toSearch == " contest" || toSearch == " trivia") {
          document.getElementById('numtweets').disabled = true;
          document.getElementById('numtweets').value = 0;
          document.getElementById('plusbutton').disabled = true;
          document.getElementById('minusbutton').disabled = true;
          document.getElementById('check_geo').disabled = true;
        } else {
          document.getElementById('plusbutton').disabled = false;
          document.getElementById('minusbutton').disabled = false;
          document.getElementById('numtweets').disabled = false;
          document.getElementById('numtweets').value = "25";
          document.getElementById('numtweets').setAttribute('value', "25");
          document.getElementById('numtweets').min = min;
          document.getElementById('numtweets').max = "100";
          document.getElementById('numtweetslabel').innerHTML = "Number:";
        }
      }

    }
    resetFilters();
    $("#base").empty();
    if (choice == "user") {
      setValues("User name...", "User", "javascript:userTimeline()", true, " user name", 5);
    } else if (choice == "text") {
      setValues("Text...", "Text", "javascript:textTweet()", false, " text", 10);
    } else if (choice == "hashtag") {
      setValues("Hashtag ...", "Hashtag", "javascript:hashtagTweet()", true, " hashtag", 10)
    } else if (choice == "location") {
      setValues("Location ...", "Location", "javascript:locationTweet()", true, " location", 10);
    } else if (choice == "contest") {
      setValues("Contest ...", "Contest", "javascript:contestTweet()", true, " contest", 0);
    } else if (choice == "trivia") {
      setValues("Trivia ...", "Trivia", "javascript:triviaTweet()", true, " trivia", 0);
    }
  }
}


function setPlusMinus() {
  //bottoni + e -
  var plusbutton = document.getElementById('plusbutton');
  var minusbutton = document.getElementById('minusbutton');
  var numtweets = document.getElementById('numtweets');

  plusbutton.addEventListener("click", () => { changeval('plus'); })
  minusbutton.addEventListener("click", () => { changeval('minus'); })
  numtweets.addEventListener('change', () => { changeval('equal'); })

  function changeval(op) {
    var val = parseInt(document.getElementById('numtweets').value)
    var min = document.getElementById('numtweets').min;
    var max = document.getElementById('numtweets').max;
    if (op == 'plus') val++;
    else if (op == 'minus') val--;

    if (val <= max && val >= min) {
      document.getElementById('numtweets').setAttribute("value", val);
      document.getElementById('numtweets').value = val;
    }
    else { document.getElementById('numtweets').value = numtweets.getAttribute('value'); }
  }
}

function uncheckAndListen(id, myChangebar) {
  let choice = document.getElementById(id);
  choice.checked = false;
  choice.addEventListener('click', changebar(myChangebar), false);
}

window.onunload = function () {
  closeStream();
}
window.onload = function () {
  $.when(
    $.getScript("Map.js"),
    $.getScript("Chart.js")
  ).done(myonload)
  function myonload() {
    callStream();
    BlankMap(mymap);
    resetFilters();
    document.getElementById('numtweets').value = 25;
    document.getElementById('searchbar').value = "";
    uncheckAndListen('radio_userTimeline', "user");
    uncheckAndListen('radio_textTweets', "text");
    uncheckAndListen('radio_hashtagTweets', "hashtag");
    uncheckAndListen('radio_location', "location");
    uncheckAndListen('radio_contest', "contest");
    uncheckAndListen('radio_trivia', "trivia");
    let choice_first = document.getElementById('radio_userTimeline');
    choice_first.checked = true;
    var choice_veri = document.getElementById('verified');
    var choice_geo = document.getElementById('check_geo');
    var choice_sent = document.getElementById('check_sent');
    var choice_media = document.getElementById('containmedia');
    var choice_nocont = document.getElementById('notcontain');
    choice_sent.checked = false;
    choice_sent.disabled = true;
    choice_geo.checked = false;

    function click_geo() {
      only_geo = choice_geo.checked;
      if ($("#searchby").attr("placeholder") == "Text")
        choice_sent.disabled = !choice_sent.disabled
      changefilternumber(only_geo)
    }
    function click_sent() {
      sent_analyze = choice_sent.checked;
      if ($("#searchby").attr("placeholder") == "Text")
        choice_geo.disabled = !choice_geo.disabled
      changefilternumber(sent_analyze)
    }

    function click_nocont() {
      if ((choice_nocont.value != "" && !nocont) || (choice_nocont.value == "" && nocont)) {
        nocont = !nocont;
        changefilternumber(nocont);
      }
    }

    function changefilternumber(filter) {
      let filternumber = parseInt(document.getElementById('input-end').placeholder);
      if (filter) document.getElementById('input-end').setAttribute('placeholder', filternumber + 1);
      else document.getElementById('input-end').setAttribute('placeholder', filternumber - 1);
    }
    choice_geo.addEventListener('change', click_geo, false);
    choice_sent.addEventListener('change', click_sent, false);
    choice_veri.addEventListener('change', () => { veri = choice_veri.checked; changefilternumber(veri) }, false);
    choice_media.addEventListener('change', () => { nomedia = choice_media.checked; changefilternumber(nomedia) }, false)
    choice_nocont.addEventListener('input', click_nocont, false);

    setPlusMinus();
  }
}

async function embedTweets(data, user = null, sentiment = false, geo = false) {
  let attr = "tweets";
  let myId = "id";
  let myGeo = "geo";
  if (sentiment)
    attr = "data"
  if (geo) {
    myId = "id_str";
    myGeo = "place";
  }
  MulMapMarkers(mymap, data[attr], user, true);
  for (let tweet of data[attr]) {
    if ((tweet[myGeo] == null && !only_geo) || (tweet[myGeo] != null)) {
      let embed = $("<blockquote>");
      embed.addClass('twitter-tweet');
      embed.addClass('ourTweets');
      let atweet = $("<a>");
      let myurl = "https://twitter.com/tweet/status/" + tweet[myId];
      atweet.attr('href', myurl);
      embed.append(atweet);
      let newT = $("<div>");
      newT.addClass("tweet");
      newT.append(embed);
      if (sentiment) {
        if (data['analysis_data']['avg'] != null) {
          let newSent = sentimentize(tweet);
          newT.append(newSent);
        }
      }
      await $("#base").append(newT);
    }
  }
}

function sentimentize(tweet) {
  let newSent = $('<div>');
  newSent.addClass('sentiment');
  let p = $("<p>");
  p.text("Score: " + tweet['sentiment']['eval'][0]['Score']);
  newSent.append(p);
  p = $("<p>");
  p.text("Numero di parole positive: " + tweet['sentiment']['eval'][0]['PosL']);
  newSent.append(p);
  let t = "";
  for (let pos of tweet['sentiment']['eval'][0]['Pos']) {
    t += pos + ", ";
  }
  p = $("<p>");
  p.text("Parole positive: " + t);
  newSent.append(p);
  p = $("<p>");
  p.text("Numero di parole negative: " + tweet['sentiment']['eval'][0]['NegL']);
  newSent.append(p);
  let tn = "";
  for (let pos of tweet['sentiment']['eval'][0]['Neg']) {
    tn += pos + ", ";
  }
  p = $("<p>");
  p.text("Parole negative: " + tn);
  newSent.append(p);
  return newSent;
}

async function triviaTweet() {
  await ResetAllCharts();
  $("#base").empty();
  var trivia = document.getElementById('searchbar').value;
  trivia = trivia.replace("#", "~");
  var url = serverUrl + "poll/" + trivia;
  $.ajax({
    type: 'GET',
    url: url,
    crossDomain: true,
    success: function (data) {
      if (data) {
        let title = $('<h1>');
        let titlediv = $('<div>');
        title.text("Trivia Contest " + trivia.replace("~", ""));
        titlediv.append(title);
        titlediv.addClass("titlediv");
        $("#base").append(titlediv);
        let total = 0;
        let totalRight = 0;
        for (let singlePoll of data) {
          let embed = $("<blockquote>");
          embed.addClass('twitter-tweet');
          embed.addClass('ourTweets');
          let atweet = $("<a>");
          let myurl = "https://twitter.com/tweet/status/" + singlePoll['id'];
          atweet.attr('href', myurl);
          embed.append(atweet);
          let newT = $("<div>");
          newT.addClass("tweet");
          newT.append(embed);
          let correct = $("<div>");
          correct.addClass("correct-poll");
          if (singlePoll['Correct'])
            correct.text("The correct answer is: " + singlePoll['Correct']);
          else
            correct.text("The correct answer has not yet been revealed");
          newT.append(correct);
          $("#base").append(newT);
          let scripting = `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>`;
          $("#base").append(scripting)
          var totals = countTotalAnswers(singlePoll, total, totalRight);
          total = totals.total;
          totalRight = totals.totalRight;
        }
        if (totals.total > 0) {
          let totalWrong = totals.total - totals.totalRight;
          let graphAnswers = [totalWrong, totals.totalRight];
          GraphConteinerConstructor('PollChartID');
          let newCtx = CtxConstructor('PollChartID');
          let myChart = new Chart(newCtx, PollChartConstructor(graphAnswers, "doughnut"));

        }
      } else {
        let newErr = $("<p>");
        newErr.text("Errore: Poll non trovato");
        $("#base").append(newErr);
      }
    },
    error: () => {
      let errore = $("<div>")
      errore.text("Errore: Poll non trovato");
      $("#base").append(errore);
    }
  })
}

function countTotalAnswers(singlePoll, total, totalRight) {
  if (singlePoll['Correct']) {
    let actCorrect = singlePoll['Correct'] - 1;
    for (let i = 0; i < singlePoll['Poll']['options'].length; i++) {
      total += singlePoll['Poll']['options'][i]['votes'];
      if (i == actCorrect)
        totalRight += singlePoll['Poll']['options'][i]['votes'];
    }
  }
  return { 'total': total, 'totalRight': totalRight };
}

async function contestTweet() {
  await ResetAllCharts();
  $("#base").empty();
  var contest = document.getElementById('searchbar').value;
  contest = contest.replace("#", "~");
  var url = serverUrl + "concorso/" + contest;
  $.ajax({
    type: 'GET',
    url: url,
    crossDomain: true,
    success: function (data) {
      if (data['bando']) {
        let myreg = new RegExp("_", "g")
        let labels = []
        let votes = []
        let top = []
        let nowtop = { "part": "", "vote": 0 }
        let topping = data['results'];
        let index;
        let j = 0;
        for (let result of topping) {
          labels.push(result['Partecipante'].replace(myreg, " "));
          votes.push(result['Voti']);
          if (result['Voti'] > nowtop['vote']) {
            nowtop['part'] = result['Partecipante'].replace(myreg, " ");
            nowtop['vote'] = result['Voti'];
            index = j;
          }
          j++;
        }
        topping.splice(index, 1);
        top.push(nowtop);
        index = 0;
        for (let i = 0; i < 2; i++) {
          j = 0
          nowtop = { "part": "", "vote": 0 }
          for (let result of topping) {
            if (result['Voti'] > nowtop['vote']) {
              nowtop['part'] = result['Partecipante'].replace(myreg, " ");
              nowtop['vote'] = result['Voti'];
              index = j
            }
            j++;
          }
          topping.splice(index, 1);
          top.push(nowtop);
        }
        let Colors = RandomChartColorsGenerator(labels);
        GraphConteinerConstructor('booksChartID');
        var BooksCtx = CtxConstructor('booksChartID');
        bookChart = new Chart(BooksCtx, InfiniteElementsChartConstructor(votes, labels, "doughnut", "Numero Voti", Colors));
        GraphConteinerConstructor('booksChartTopID');
        var BooksTopCtx = CtxConstructor('booksChartTopID');
        bookChartTop = new Chart(BooksTopCtx, InfiniteElementsChartConstructor(votes, labels, "bar", "Numero Voti", Colors));
        ////////////////////////
        let title = $('<h1>');
        let titlediv = $('<div>');
        title.text("Literary contest " + data['bando'][0]['Text'].replace("#bandiscoconcorso", "").split(" ")[0] + " organized by " + data['bando'][0]['Banditore'])
        titlediv.append(title);
        titlediv.addClass("titlediv");

        let first = $('<li>');
        let second = $('<li>');
        let third = $('<li>');

        let firstimage = $('<div>');
        firstimage.append(imagesvg);
        firstimage.addClass("place-1");
        firstimage.addClass("image");
        let firstcontent = $('<div>');
        firstcontent.addClass("content");
        firstcontent.append(("<h2>" + top[0]['part'] + "</h2>" + "<h3>is first</h3>" + "<p>" + top[0]['vote'] + " point/s</p>").toUpperCase());
        first.append(firstimage);
        first.append(firstcontent);

        let secondimage = $('<div>');
        secondimage.append(imagesvg);
        secondimage.addClass("place-2");
        secondimage.addClass("image");
        let secondcontent = $('<div>');
        secondcontent.addClass("content");
        secondcontent.append(("<h2>" + top[1]['part'] + "</h2>" + "<h3>is second</h3>" + "<p>" + top[1]['vote'] + " point/s</p>").toUpperCase());
        second.append(secondimage);
        second.append(secondcontent);

        let thirdimage = $('<div>');
        thirdimage.append(imagesvg);
        thirdimage.addClass("place-3");
        thirdimage.addClass("image");
        let thirdcontent = $('<div>');
        thirdcontent.addClass("content");
        thirdcontent.append(("<h2>" + top[2]['part'] + "</h2>" + "<h3>is third</h3>" + "<p>" + top[2]['vote'] + " point/s</p>").toUpperCase());
        third.append(thirdimage);
        third.append(thirdcontent);

        let leaders = $('<ol>');
        leaders.addClass("podium-rank");
        leaders.append(first);
        leaders.append(second);
        leaders.append(third);
        $("#base").append(titlediv);
        $("#base").append("<br>");
        $("#base").append("<br>");
        $("#base").append(leaders);
      }
    }
  })
}

async function userTimeline() {
  await ResetAllCharts();
  $("#base").empty();
  var user = document.getElementById('searchbar').value;
  if (user[0] == '@') {
    user = user.substring(1);
  }
  let numtweets = document.getElementById('numtweets').value;
  var url = serverUrl + "users/" + user + "?numtweets=" + numtweets;
  $.ajax({
    type: 'GET',
    url: url,
    crossDomain: true,
    success: function (data) {
      if (data['timeline']['tweets']) {
        embedTweets(data['timeline'], user);
      }
      else {
        let newT = $('<div>');
        let p = $('<p>');
        p.text("Utente non trovato");
        newT.append(p);
        $('#base').append('<br>');
        $('#base').append(newT);
      }
      let scripting = `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>`;
      $("#base").append(scripting)
      let TextTermCloud = '';
      for (let singleText of data['timeline']['tweets']) {
        if ((singleText['geo'] != null) || (!only_geo))
          TextTermCloud = TextTermCloud + singleText['Text'];
      }
      WordCloud = WordcloudBuilder(TextTermCloud.toLowerCase(), null, 'WordCloudID');
      let myDates = []
      let myOccurs = []
      for (let occur of data['Occurrencies']) {
        myDates.push(occur['Date']);
        myOccurs.push(occur['Times']);
      }
      GraphConteinerConstructor('userTimeID');
      let UserCtx = CtxConstructor('userTimeID');
      myOccurs = myOccurs.reverse();
      myDates = myDates.reverse();
      let myChart = new Chart(UserCtx, InfiniteElementsChartConstructor(myOccurs, myDates, "line", "Tweet Timeline", null));
    },
    error: function (err) {
      let newT = $("<div>");
      let txt = $("<p>");
      txt.text("Error: " + "Utente non trovato");
      newT.append(txt);
      $("#base").append(newT);
      $("#base").append("<br>");
    }
  });
}


async function hashtagTweet() {
  await ResetAllCharts();
  $("#base").empty();
  var tag = document.getElementById('searchbar').value;
  let myErr = false;
  if (tag.includes(' ')) {
    myErr = true;
  }
  if (tag[0] != '#') {
    tag = "#" + tag;
  }
  let numtweets = document.getElementById('numtweets').value;
  var url = serverUrl + "recents/" + tag.replace("#", "~") + "?numtweets=" + numtweets;

  if (myErr) {
    let newT = $('<div>');
    newT.text(" Non un Hashtag");
    $("#base").append(newT);
    return;
  }

  $.ajax({
    type: 'GET',
    url: url,
    crossDomain: true,
    success: function (data) {
      embedTweets(data, null, true);
      let scripting = `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>`;
      $("#base").append(scripting)
      let TextTermCloud = '';
      for (let singleText of data['data']) {
        if ((singleText['geo'] != null) || (!only_geo))
          TextTermCloud = TextTermCloud + singleText['Text'];
      }
      WordCloud = WordcloudBuilder(TextTermCloud.toLowerCase(), null, 'WordCloudID');
    },
    error: function (err) {
      let newT = $("<div>");
      let txt = $("<p>");
      txt.text("Error: " + "Hashtag non trovato");
      newT.append(txt);
      $("#base").append(newT);
      $("#base").append("<br>");
    }
  });
}


async function textTweet() {
  var frase = document.getElementById('searchbar').value
  frase = frase.replace("#", "~");
  await searchText(frase);
}

async function searchText(frase) {
  await ResetAllCharts();
  $("#base").empty();
  document.getElementById('searchbar').value = frase.replace("~", "#");
  frase = frase.replace("#", "~");
  let esclusi = document.getElementById('notcontain').value.replaceAll(" ", "");
  let media = document.getElementById('containmedia').checked;
  let verified = document.getElementById('verified').checked;

  let numtweets = document.getElementById('numtweets').value;
  var url = serverUrl + "recents/" + frase + "?sentiment=" + sent_analyze + "&notcontain=" + esclusi + "&hasmedia=" + media + "&numtweets=" + numtweets + "&verified=" + verified;
  $.ajax({
    type: 'GET',
    url: url,
    crossDomain: true,
    success: function (data) {
      if (data['analysis_data']['avg'] != null) {
        let newS = $('<div>');
        let p = $('<p>');
        p.text("Il sentimento per questa stringa è: " + data['analysis_data']['avg']);
        if (data['analysis_data']['avg'] >= 1)
          p.addClass('correct-poll');
        else if (data['analysis_data']['avg'] <= -1)
          p.addClass('correct-poll-bad');
        else
          p.addClass('correct-poll-neutral');
        newS.append(p);
        $('#base').append('<br>');
        $("#base").append(newS);
        $('#base').append('<br>');
        let NeutralWords = data['analysis_data']['Tot_words'] - data['analysis_data']['Tot_pos'] - data['analysis_data']['Tot_neg'];
        let SData = [data['analysis_data']['Tot_neg'], data['analysis_data']['Tot_pos'], NeutralWords];
        GraphConteinerConstructor('SentimentChartID');
        var SentimetCtx = CtxConstructor('SentimentChartID');
        SentimentChart = new Chart(SentimetCtx, SentimentChartConstructor(SData, type));
      }
      let TextTermCloud = '';
      for (let singleText of data['data']) {
        if ((singleText['geo'] != null) || (!only_geo))
          TextTermCloud = TextTermCloud + singleText['Text'];
      }
      WordCloud = WordcloudBuilder(TextTermCloud.toLowerCase(), data['analysis_data']['avg'], 'WordCloudID');
      embedTweets(data, null, true);
      let scripting = `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>`;
      $("#base").append(scripting);
    },
    error: function (err) {
      let newT = $("<div>");
      let txt = $("<p>");
      txt.text("Error: " + "Ricerca Errata");
      newT.append(txt);
      $("#base").append(newT);
      $("#base").append("<br>");
    }
  });
}

async function locationTweet() {
  await ResetAllCharts();
  $("#base").empty();
  var location = document.getElementById('searchbar').value
  let radius = document.getElementById('numtweets').value;
  $.ajax({
    type: 'GET',
    url: 'https://nominatim.openstreetmap.org/search?format=json&q=%27' + location,
    crossDomain: true,
    success: function (geoloc) {
      var url = serverUrl + "geo/" + geoloc[0]['lat'] + "x" + geoloc[0]['lon'] + "?radius=" + radius;
      $.ajax({
        type: 'GET',
        url: url,
        crossDomain: true,
        success: function (data) {
          embedTweets(data, null, false, true);
          let scripting = `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>`;
          $("#base").append(scripting)
          let TextTermCloud = '';
          for (let singleText of data['statuses']) {
            if ((singleText['place'] != null) || (!only_geo))
              TextTermCloud = TextTermCloud + singleText['Text'];
          }
          WordCloud = WordcloudBuilder(TextTermCloud.toLowerCase(), null, 'WordCloudID');
          let places = [];
          for (let thisT of data['statuses']) {
            if (thisT['place'] == undefined)
              continue
            else {
              if (thisT['place'] != null) {
                if (thisT['place']['full_name'] != location) {
                  places[thisT['place']['full_name'].split(',')[0]] = 0;
                }
              }
            }
          }
          for (let thisT of data['statuses']) {
            if (thisT['place'] == undefined)
              continue
            else {
              if (thisT['place'] != null) {
                if (thisT['place']['full_name'] != location) {
                  places[thisT['place']['full_name'].split(',')[0]] += 1;
                }
              }
            }
          }
          let placesarray = []
          let j = 0
          for (let place in places) {
            placesarray[j] = places[place];
            j++;
          }
          GraphConteinerConstructor('locationChartID');
          var BooksTopCtx = CtxConstructor('locationChartID');
          bookChartTop = new Chart(BooksTopCtx, InfiniteElementsChartConstructor(placesarray, Object.keys(places), "bar", "Città diverse da quella data", null));
        },
        error: function (err) {
          let newT = $("<div>");
          let txt = $("<p>");
          txt.text("Error: " + err.responseJSON.message);
          newT.append(txt);
          $("#base").append(newT);
          $("#base").append("<br>");
        }
      });
    }
  });
}
