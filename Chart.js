//Aggiorna il grafico cambiandone il tipo
function ChartTypeUpdate(chart, NewType) {
  chart.type = NewType;
  chart.update();
}

function GraphConteinerConstructor(ChartID) {
  let mygraph = $('<canvas>');
  mygraph.attr('id', ChartID);
  $('#graphs').prepend(mygraph);
}

function CtxConstructor(ChartID) {
  return document.getElementById(ChartID).getContext("2d");
}

function ResetChart(ChartID) {
  $(ChartID).remove();
}

//Grafico per sentiment analysis
function SentimentChartConstructor(SentimentData, ChartType) {
  return {
    type: ChartType,
    data: {
      labels: ['Negative', 'Positive', 'Neutre'],
      datasets: [{
        label: 'Numero parole',
        data: SentimentData,
        backgroundColor: [
          'rgba(255, 0, 0, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(105, 105, 105, 0.6)',
        ],
        borderColor: [
          'rgba(255, 0, 0, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(105, 105, 105, 1)',
        ],
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      scales: {
        yAxes: ChartType == 'bar' ? [{
          ticks: {
            beginAtZero: true
          }
        }] : []
      }
    }
  };
}

//Grafico Risposte corrette Poll
function PollChartConstructor(PollData, ChartType) {
  return {
    type: ChartType,
    data: {
      labels: ['Errate', 'Corrette'],
      datasets: [{
        label: 'Numero parole',
        data: PollData,
        backgroundColor: [
          'rgba(255, 0, 0, 0.6)',
          'rgba(0, 153, 0, 0.6)',
        ],
        borderColor: [
          'rgba(255, 0, 0, 1)',
          'rgba(0, 153, 0, 1)',
        ],
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      scales: {
        yAxes: (ChartType == 'bar' || ChartType == 'line') ? [{
          ticks: {
            beginAtZero: true
          }
        }] : []
      }
    }
  };
}

//Generatore di n colori casuali per i grafici
function RandomChartColorsGenerator(ListOfItems) {
  let BackGroundChartColors = [];
  let BorederColors = [];
  let Colors = [];
  for (let item of ListOfItems) {
    let SliceColor = [];
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let b = Math.floor(Math.random() * 256);

    SliceColor.push(r);
    SliceColor.push(g);
    SliceColor.push(b);

    BackGroundChartColors.push('rgba(' + SliceColor + ', 0.6)')
    BorederColors.push('rgba(' + SliceColor + ', 1)')
  }
  Colors.push(BackGroundChartColors)
  Colors.push(BorederColors)
  return Colors;
}

//Grafico di n elementi con n colori autogenerati
function InfiniteElementsChartConstructor(Data, Names, ChartType, label, Colors) {
  if (Colors == null) {
    Colors = RandomChartColorsGenerator(Names)
  }
  return {
    type: ChartType,
    data: {
      labels: Names,
      datasets: [{
        label: label,
        data: Data,
        backgroundColor: (ChartType == 'bar' || ChartType == 'doughnut') ? Colors[0] : 'rgba(255,118,37,0.7)',
        borderColor: (ChartType == 'bar' || ChartType == 'doughnut') ? Colors[1] : 'rgba(255,118,37,1)',
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      scales: {
        yAxes: (ChartType == 'bar' || ChartType == 'line') ? [{
          ticks: {
            beginAtZero: true
          }
        }] : []
      }
    }
  };
}

function WordcloudBuilder(text, SentimentValue, ChartID) {
  const RegEx_http = RegExp('https://t', "g");
  text = text.replace(RegEx_http, '');
  text = text.split(' ').slice(0, 1000).join(' ');
  let WordCloudColors = [];
  if (SentimentValue >= 1) WordCloudColors = ['#00E500', '#00B200', '#00FF00', '#007F00', '#00B300'];
  else if (SentimentValue < 1 && SentimentValue > -1 && SentimentValue != null) WordCloudColors = ['#808080', '#8A8A8A', '#9D9D9D', '#A7A7A7', '#767676'];
  else if (SentimentValue <= -1) WordCloudColors = ['#FFAAAA', '#D46A6A', '#AA3939', '#801515', '#550000'];
  else WordCloudColors = ['#33FFBE', '#33FFF6', '#33F3FF', '#33CEFF', '#33BEFF'];
  let lines = text.split(/[,\. ]+/g);
  let data = lines.reduce((arr, word) => {
    let obj = Highcharts.find(arr, newobj => newobj.name === word);
    if (obj) {
      obj.weight += 1;
    } else {
      obj = {
        name: word,
        weight: 1
      };
      arr.push(obj);
    }
    return arr;
  }, []);
  let mygraph = $('<div>');
  mygraph.attr('id', ChartID);
  $('#graphs').prepend(mygraph);
  Highcharts.chart(ChartID, {
    accessibility: {
      screenReaderSection: {
        beforeChartFormat: '<h5>{chartTitle}</h5>' +
          '<div>{chartSubtitle}</div>' +
          '<div>{chartLongdesc}</div>' +
          '<div>{viewTableButton}</div>'
      }
    },
    plotOptions: {
      series: {
        cursor: 'pointer',
        point: {
          events: {
            click: function () {
              document.getElementById('radio_textTweets').click();
              resetFilters();
              let point = this;
              searchText(point.name);
            }
          }
        }
      }
    },

    series: [{
      colors: WordCloudColors,
      type: 'wordcloud',
      data,
      name: 'Occorrenze'
    }],
    title: {
      text: ''
    }
  });
}
