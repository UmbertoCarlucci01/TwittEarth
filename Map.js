//Mappa
//Costruisce una mappa vuota
function BlankMap(Map) {
  L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    minZoom: 1,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1
  }).addTo(Map);
}

function ResetMap(Map) {
  Map.setView([0, 0], 2);
  //Elimina tutti i marker
  Map.eachLayer(function (layer) {
    if (!!layer.toGeoJSON) {
      Map.removeLayer(layer);
    }
  })
}

function removeMap(Map) {
  if (Map && Map.remove) {
    Map.off();
    Map.remove();
  }
  $('#map').removeClass("leaflet-container");
  $('#map').removeClass("leaflet-touch");
  $('#map').removeClass("leaflet-fade-anim");
  $('#map').removeAttr("tabindex")
}

function MulMapMarkers(Map, TweetsList, User, noLoc) {
  let MarkerGroup = [];
  //Elimina tutti i marker
  ResetMap(Map);
  //Crea dei marker per ogni coordinata fornita
  for (let i = 0; i < TweetsList.length; i = i + 1) {
    if (noLoc) {
      if (TweetsList[i]['geo'] != null || TweetsList[i]['place'] != null) {
        if (User != null) {
          let tmp = User
          if (TweetsList[i]['place'] != null)
            tmp = TweetsList[i]['Author'];
          L.marker([TweetsList[i]['geo']['coord_center'][1], TweetsList[i]['geo']['coord_center'][0]]).addTo(Map).bindPopup("<b>" + tmp + "</b>" + ": <br/>" + TweetsList[i]['Text']);
          MarkerGroup.push(L.marker([TweetsList[i]['geo']['coord_center'][1], TweetsList[i]['geo']['coord_center'][0]]))
        }
        else {
          L.marker([TweetsList[i]['geo']['coord_center'][1], TweetsList[i]['geo']['coord_center'][0]]).addTo(Map).bindPopup(TweetsList[i]['Text']);
          MarkerGroup.push(L.marker([TweetsList[i]['geo']['coord_center'][1], TweetsList[i]['geo']['coord_center'][0]]))
        }
      }
    }
  }
  let group = new L.featureGroup(MarkerGroup);
  if (MarkerGroup.length != 0) Map.fitBounds(group.getBounds());
}
