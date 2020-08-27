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

// Origin page IDs.
// var pids = [12765628];

/*
  Based on the mediawiki as of 2020.08.27:
  https://www.mediawiki.org/w/api.php?action=help&modules=query
*/
var API_base = 'https://en.wikipedia.org/w/api.php';
var API_url = API_base + "?origin=*";

// Trigger a 
function fetchPageID(id) {
  let url = API_url;
  var pids = [id];
  // Parse params.
  // TODO: Organize this much better.
  var params = {
    action: 'query',
    // meta: 'siteinfo',
    // list: "querypage",
    // list: "alllinks, random",
    // qppage: "Uncategorizedpages",
    // qplimit: "10",
    format: 'json',
    exintro: true,
    explaintext: true,
    // list: 'backlinks',
    // params for backlinks:
    // blpageid: pids[0],
    prop: 'info|extracts|pageimages|linkshere',
    // prop: 'info|extracts|linkshere',
    inprop: 'url',
    // prop: 'info',
    // linkshere: true,
    lhprop: 'pageid|title|redirect',
    iwurl: true,
    // iwlinks: true,
    pageids: pids,
    indexpageids: true,
  };
  // Convert params into url query string.
  Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});
  fetch(url)
    .then(function(response) { return response.json(); })
    .then(function(response) {
      // Parsing API response.
      console.log('API RESPONSE:');
      console.log(response);
      // console.log(response.query);
      // var alllinks = response.query.alllinks;
      $.each(response.query.pages, function(id, data) {
        parseAPIdata(id, data);
        // console.log(pane);
      });
    })
    .catch(function(error) {
      console.log(error);
    });
}

neighbors = {};

// General entry point for reception of the MediaWiki API.
// Since some data will require continuations, this will handle the async pulls.
function parseAPIdata(id, data) {
  console.log('Page Data for ' + id);
  console.log(data);
  let title = data.title;
  let extract = data.extract;
  let fullUrl = data.fullurl || 'unknown';

  let htmlGen = '<div class="pane">' +
    '<div class="pane-header">' +
    '<img class="thumbnail" src="' + data.thumbnail.source + '"/>' +
    title +
    '<a class="full-link" href="' + fullUrl + '" target="_blank">' + 'View Full Page</a>' +
    '</div>' +
    '<div class="pane-excerpt">' +
      extract +
    '</div>' +
    '</div>';
  console.log(htmlGen);
  pane = $(htmlGen);
  pane.appendTo(main);

  console.log(data.linkshere.length);
  // Relationship Objects
  $.each(data.linkshere, function(id, n) {
    let gen = '<div class="pane small">' +
      n.title + '<br/>' + n.pageid +
      '</div>';
    let $child = $(gen);
    neighbors[id] = $child;
    $child.appendTo(main);
    // Animate movement of neighbor panels to specific spots.
    $(this).delay(100+(id*5)).queue(function() {
      console.log(id, n);
      $child.addClass('placed');
      neighbors[id].addClass('placed');
      neighbors[id].css('left', '' + (id * 10) + 'rem');
      neighbors[id].css('top', '' + (30 + id * 1) + 'rem');
    });
  });
}

$(document).ready(function() {
  // ORiginal page:
  // let first = 27667;
  let spacetime = 28758;
  // let boganyi = 12765628;
  $(this).delay(1337).queue(function() {
    fetchPageID(spacetime);
  });
});
