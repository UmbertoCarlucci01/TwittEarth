const external = require('./server.js');
const supertest = request = require('supertest')

const numberOfTweets = 12; //between 10 and 100
const latitude = 44.49382035;
const longitude = 11.3426327;

describe("Testing GETs", () => {
  describe("with given default hashtag", () => {
    beforeAll(async () => {
      return testHashtags = await request(external.httpServer).get('/recents/' + '~' + 'nasa'), formattedTestHashtags = JSON.parse(testHashtags.text);
    })
    test("Status code is 200", () => {
      expect(testHashtags.statusCode).toBe(200);
    });
    test("Every returned tweet contains #nasa", () => {
      for (let i = 0; i < formattedTestHashtags.data.length; i++) {
        //if(!formattedTestHashtags.data[i].Text.match(/RT/) && !formattedTestHashtags.data[i].Text.match(/t.co/))
        if (!(new RegExp(/RT/)).test(formattedTestHashtags.data[i].Text) && !(new RegExp(/t.co/)).test(formattedTestHashtags.data[i].Text))
          expect(formattedTestHashtags.data[i].Text).toMatch(/#nasa/i);
      }
    })
  })
  describe("with given default text", () => {
    beforeAll(async () => {
      return testText = await request(external.httpServer).get('/recents/nasa'), formattedTestText = JSON.parse(testText.text);
    });
    test("Status code is 200", () => {
      expect(testText.statusCode).toBe(200);
    })
    test("Every returned tweet contains the word \"nasa\"", () => {
      for (let i = 0; i < formattedTestText.data.length; i++) {
        //if(!formattedTestText.data[i].Text.match(/RT/))
        if (!(new RegExp(/RT/)).test(formattedTestText.data[i].Text) && !(new RegExp(/t.co/)).test(formattedTestText.data[i].Text))
          expect(formattedTestText.data[i].Text).toMatch(/nasa/i);
      }
    })
  })
  describe("with given default Username", () => {
    beforeAll(async () => {
      return testUsername = await request(external.httpServer).get('/users/Team10Test2122'), formattedTestUsername = JSON.parse(testUsername.text);
    })
    test("Status code is 200", () => {
      expect(testUsername.statusCode).toBe(200);
    })
    test("The only returned tweet has the expected text", () => {
      expect(formattedTestUsername.timeline.tweets[0].Text).toMatch(/testing tweet uniboswe/i)
    })
  })
  describe("with given default location", () => {
    beforeAll(async () => {
      return testLocation = await request(external.httpServer).get('/geo/' + latitude + 'x' + longitude + '?radius=1'), formattedTestLocation = JSON.parse(testLocation.text);
    })
    test("Status code is 200", () => {
      expect(testLocation.statusCode).toBe(200);
    })
    test("The location is the one identified by latitude: " + latitude + " and longitude: " + longitude, () => {
      for (let i = 0; i < formattedTestLocation.statuses.length; i++) {
        if (formattedTestLocation.statuses[i].place.place_type == 'city')
          expect(formattedTestLocation.statuses[i].place.name).toBe("Bologna");
      }
    })
  })
});

describe("Testing other functions", () => {
  describe("Testing sentiment analysis", () => {
    beforeAll(async () => {
      return positiveSentiment = await request(external.httpServer).get('/recents/good?sentiment=true&numtweets=10'),
        formattedPositiveSentiment = JSON.parse(positiveSentiment.text),
        negativeSentiment = await request(external.httpServer).get('/recents/bad?sentiment=true&numtweets=10'),
        formattedNegativeSentiment = JSON.parse(negativeSentiment.text);
    })
    test("Status code is 200 for given positive word", () => {
      expect(positiveSentiment.statusCode).toBe(200);
    })
    test("Status code is 200 for given negative word", () => {
      expect(negativeSentiment.statusCode).toBe(200);
    })
    test("There is at least one positive word \"good\"", () => {
      expect(formattedPositiveSentiment.data[0].sentiment.eval[0].PosL).toBeGreaterThanOrEqual(1);
    })
    test("There is at least one negative word \"bad\"", () => {
      expect(formattedNegativeSentiment.data[0].sentiment.eval[0].NegL).toBeGreaterThanOrEqual(1);
    })
  })
  describe("Testing number of tweets", () => {
    beforeAll(async () => {
      return numberTest = await request(external.httpServer).get('/recents/nasa?numtweets=' + numberOfTweets), formattedNumberTest = JSON.parse(numberTest.text)
    })
    test("Number of returned tweets is equal to the number of requested tweets (" + numberOfTweets + ")", () => {
      expect(formattedNumberTest.Tot_tweets).toBe(numberOfTweets);
    })
  })
  describe("Testing tweets without media", () => {//Too many requests
    beforeAll(async () => {
      return noMediaTest = await request(external.httpServer).get('/recents/nasa?hasmedia=false'), formattedNoMediaTest = JSON.parse(noMediaTest.text);
    })
    test("Status code is 200", () => {
      expect(noMediaTest.statusCode).toEqual(200);
    })
  })
  describe("Testing tweet excluding some words", () => {//Too many requests
    beforeAll(async () => {
      return testExcludingWords = await request(external.httpServer).get('/recents/nasa?sentiment=false&notcontain=space'), formattedTestExcludingWords = JSON.parse(testExcludingWords.text);
    })
    test("Status code is 200", () => {
      expect(testExcludingWords.statusCode).toEqual(200);
    })
    test("Every tweet does not contain the word \"space\" ", () => {
      for (let i = 0; i < formattedTestExcludingWords.data.length; i++)
        expect(formattedTestText.data[i].Text).not.toMatch(/" "+"space"+" "/);
    })
  })
  describe("Testing contests", () => {
    beforeAll(async () => {
      return testContest = await request(external.httpServer).get('/concorso/igsw10'), formattedTestContest = JSON.parse(testContest.text);
    })
    test("Every field of the contest is defined", () => {
      expect(formattedTestContest.bando.length).toBeGreaterThanOrEqual(0)
      expect(formattedTestContest.partecipanti.length).toBeGreaterThanOrEqual(0)
      expect(formattedTestContest.votanti.length).toBeGreaterThanOrEqual(0)
      expect(formattedTestContest.results.length).toBeGreaterThanOrEqual(0)
    })
  })
  describe("Testing trivia", () => {
    beforeAll(async () => {
      return testPoll = await request(external.httpServer).get('/poll/triviapolligsw10'), formattedTestPoll = JSON.parse(testPoll.text)
    })
    test("Every tweet with the testing hashtag contains a poll", () => {
      for (let i = 0; i < formattedTestPoll.length; i++) {
        expect(formattedTestPoll[i].Poll).toBeDefined();
      }
    })

  })
});
