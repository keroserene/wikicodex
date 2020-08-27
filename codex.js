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
  // console.log(htmlGen);
  pane = $(htmlGen);
  pane.appendTo(main);

  arrangeNeighbors(data.linkshere);

}

/* Aesthetics - related nodes shall relate radially from the central node, the
 * current page. The nodes shall be evenly distributed among the angle of
 * neighbor, centered south.
 * As the number of nodes increases, the total angle approaches 2:00 and 10:00, like
 * BM.
 */
function _radialPosition(angle) {
  let root
}

// Take N links and arrange them radially around the central node.
function arrangeNeighbors(links) {

  // console.log('Parsing total neighbors: ', links.length);
  let total = links.length;
  // Begins at 180 degrees (0600) but winds back towards 0200 as N -> inf
  let max_spread = 240;
  let root = 60 + (1.0 / total) * (max_spread / 2.0);
  let spread_angle = (180 - root) * 2;
  let spread_increment = spread_angle / total;
  let spread_start = root + spread_increment / 2;

  console.log(total, max_spread, root, spread_angle, spread_increment);

  // Relationship Objects
  $.each(links, function(id, n) {
    let radius = 42;  // in rem units

    // Set position based on angle calculation.
    let angle = spread_start + (spread_increment * id);
    let angleR = angle * Math.PI / 180.0;
    let x = 50 + Math.sin(angleR) * radius;
    let y = 30 - Math.cos(angleR) * radius;
    console.log(id, n, angle, angleR, x, y);

    let gen = '<div class="pane small">' +
      n.title + '<br/>' + n.pageid + '\n<br/>'  + 
      angle + '\n' + parseInt(x) + '\n' + parseInt(y) +
      '</div>';
    let $child = $(gen);
    neighbors[id] = $child;
    $child.appendTo(main);
    // Animate movement of neighbor panels to specific spots.
    $(this).delay(100+(id*5)).queue(function() {
      $child.addClass('placed');
      neighbors[id].addClass('placed');

      neighbors[id].css('left', '' + x + 'rem');
      neighbors[id].css('top', '' + y + 'rem');
      // neighbors[id].css('left', '' + (id * 10) + 'rem');
      // neighbors[id].css('top', '' + (30 + id * 1) + 'rem');
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
