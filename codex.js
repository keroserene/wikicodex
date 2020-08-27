console.log('this is a page.');

/*
// var fetch = https://en.wikipedia.org/wiki/Piano
var url = 'https://en.wikipedia.org/wiki/Piano';

function fetchPage() {
  let req = new XMLHttpRequest();
  req.open("GET", url);
  console.log(req);
  req.onreadystatechange = function(e) {
    console.log(req.responseText);
  };
  // req.send();
} */
// Making use of the API.

var main = $('.main');

var API_base = 'https://en.wikipedia.org/w/api.php';
var params = {
    action: 'query',

    // list: "querypage",
    // list: "alllinks, random",
    // qppage: "Uncategorizedpages",
    // qplimit: "10",
    format: 'json',
    prop: 'extracts',
    exintro: true,
    explaintext: true,
    // iwurl: true,
    pageids: [12765628],
    indexpageids: true,
};

url = API_base + "?origin=*";
Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

fetch(url)
  .then(function(response){return response.json();})
  .then(function(response) {
    console.log(response);
    // console.log(response.query);
    var alllinks = response.query.alllinks;
    // var querypage = response.query.querypage.results;
    // for (var p in querypage) {
        // console.log(querypage[p].title);
        // console.log(querypage[p]);
    // }


    main.append('Some stuff.');
    main.append('and more stuff.');

    $.each(response.query.pages, function(id, data) {
      console.log(id);
      console.log(data);
      let title = data.title;
      let txt = data.extract;
      main.append(title);
      main.append(txt);
    });
  })
  .catch(function(error){console.log(error);});



