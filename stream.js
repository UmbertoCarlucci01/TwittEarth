var pausing = false;
var tweetcounter = 0;
const onScreenTweets = 20;
function resetpause() {
    pausing = !pausing;
    if (!pausing)
        tweetcounter = 0;
}
window.onload = function () {
    var my_pausa = document.getElementById('pausing');
    my_pausa.checked = false;
    my_pausa.addEventListener('click', () => pausing = !pausing);
    closeStream();
    callStream();
}
//var serverUrl = "http://localhost:8000/";
var serverUrl = "https://site202136.tw.cs.unibo.it/";
function callStream() {
    $.ajax({
        type: 'GET',
        url: serverUrl + "stream/tweets",
        crossDomain: true,
        success: () => { console.log("Connected to Stream") }
    })
}
getstream();

async function getstream() {
    const socket = io(serverUrl);
    console.log(socket);


    socket.on('connection', () => {
        console.log('Connected to server...')
    })

    socket.on('disconnect', () => {
        //alert("DISCONNESSO")
    })

    socket.on('tweet', (tweet) => {
        //console.log(tweet)
        const tweetData = {
            id: tweet.data.id,
            text: tweet.data.text,
        }
        let newT = $("<div>");
        if (!pausing) {
            let embed = $("<blockquote>");
            embed.addClass('twitter-tweet');
            embed.addClass('ourTweets');
            let atweet = $("<a>");
            let myurl = "https://twitter.com/tweet/status/" + tweetData['id'];
            atweet.attr('href', myurl)
            embed.append(atweet);
            newT.addClass("tweet");
            newT.append(embed);

            $("#tweetStream").prepend(newT);

            let scripting = `<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>`;
            $("#tweetStream").append(scripting);
            tweetcounter = tweetcounter + 1;
        }
        if (tweetcounter >= onScreenTweets) {
            for (let i = 0; i < onScreenTweets; i++) {
                $("#tweetStream div").last().remove();
                $("#tweetStream script").last().remove();
            }
            tweetcounter = onScreenTweets / 2;
        }
    });
}
function closeStream() {
    $.ajax({
        type: 'GET',
        async: false,
        url: serverUrl + "stream/closing",
        crossDomain: true,
        success: function () {
            console.log("Closed");
        }
    })
}

window.onpagehide = () => { closeStream() };
window.onunload = function () {
    closeStream();
}
