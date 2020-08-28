/*
An experimental knowledge graph visualizer.
@author: serene
@genesis date: 2020.08.27

Depends on the MediaWiki API.
*/

var $main = $('.main');
var $center = null;
var maindata = {};

// Generalized collections
gLevelOne = {};  // Level one particles - immediately linked with the current center.
universe = {};   // All background particles.

// Origin page IDs.
// var pids = [12765628];

/*
  Based on the mediawiki as of 2020.08.27:
  https://www.mediawiki.org/w/api.php?action=help&modules=query
*/
var API_base = 'https://en.wikipedia.org/w/api.php';
var API_url = API_base + "?origin=*";
// Constant dimensions (%) for the center pane.
var CENTER_DIMENSIONS = {
  WIDTH: 0.5,
  HEIGHT: 0.5,
}
var kAnimDelay = 23;
var kMaxParticles = 1000;

var origins = parseDimensions();
var nextId = 0;


var default_params = {
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
  prop: 'info|extracts|pageimages|links|linkshere',
  // prop: 'info|extracts|linkshere',
  piprop: 'thumbnail|original|name',
  inprop: 'url',
  // prop: 'info',
  // linkshere: true,
  lhprop: 'pageid|title|redirect',
  lprop: 'pageid|title|redirect',
  lhnamespace: '0',  // Limit to only normal articles.
  lnshow: '!redirect',
  plnamespace: '0',
  iwurl: true,
  lhlimit: 33,
  // iwlinks: true,
  // pageids: pids,  TO BE FILLED
  indexpageids: true,
};

function fetchPageID(id) {
  let params = JSON.parse(JSON.stringify(default_params));
  var pids = [id];
  params.pageids = pids;
  fetchQuery(params);
}

function fetchPageByTitle(title) {
  let params = JSON.parse(JSON.stringify(default_params));
  params.titles = [title];
  fetchQuery(params);
}

function fetchQuery(params) {
  let url = API_url;
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

/* Parse |data| retrieved from the API and populate the center pane DOM
 * elements. */
function generateCenter(data) {
  console.log('Page Data for ' + data.pageid);
  console.log(data);

  let title = data.title;
  let extract = data.extract;
  let fullUrl = data.fullurl || 'unknown';
  function _parseMainImage(data) {
    if (!data.original|| !data.original.source) {
      return '';
    }
    return '<img class="pane-main-image" src="' + data.original.source + '"/>' +
      '<div class="pane-main-image-buffer"></div>';
  }
  function _parseThumbnail(data) {
    if (!data.thumbnail || !data.thumbnail.source) {
      return '';
    }
    return '<img class="thumbnail" src="' + data.thumbnail.source + '"/>';
  }

  // Create or add the center pane to the domtree.
  $center = $('.pane.center');
  let htmlGen = '' +
    _parseMainImage(data) +
    '<a class="pane-full-link" href="' + fullUrl + '" target="_blank">' +
      '&#x02795; view full page' +
    '</a>' +
    '<div class="pane-content">' +
    '<div class="pane-header">' +
    // _parseThumbnail(data) +
    title +
    '</div>' +
    '<div class="pane-excerpt">' +
      extract +
    '</div></div>';

  if ($center.length <= 0) {
    $center = $('<div class="pane"></div>');
    $center.html(htmlGen);
    $center.appendTo($main);
    setTimeout(function() {
      $center.addClass('center');
    }, 100);
  } else {
    $center.removeClass('radiation');
    $center.removeClass('small');
    $center.html(htmlGen);
  }

  // Position the center pane in the right spot.
  origins = parseDimensions();
  // Calculate position for the center pane.
  // let pW = CENTER_DIMENSIONS.WIDTH * origins.width;
  let pH = CENTER_DIMENSIONS.HEIGHT * origins.height;
  let x = origins.x; // - pW/2;
  let y = origins.y - origins.radius/2;
  setParticleCoordinates($center, x, y);
}

// Take N links and arrange them radially around the central node.
// |links| is expected to be the JSON response from the MediaWiki API within one
// of the data elements of "response.query.pages".
function arrangeNeighbors(links) {
  if (!links) {
    console.log('No gLevelOne qualified links.');
    return;
  }
  console.log('ARRANGE NEIGHBORS', links);
  origins = parseDimensions();

  let total = links.length;
  // Begins at 180 degrees (0600) but winds back towards 0200 as N -> inf
  let max_spread = 240;
  let root = 60 + (1.0 / total) * (max_spread / 2.0);
  let spread_angle = (180 - root) * 2;
  let spread_increment = spread_angle / total;
  let spread_start = root + spread_increment / 2;
  // console.log(total, max_spread, root, spread_angle, spread_increment);

  // Fill basic info and move the neighbor particle to level one.
  $.each(links, function(id, n) {

    // Set position based on angle calculation.
    let angle = spread_start + (spread_increment * id);
    let angleR = angle * Math.PI / 180.0;
    // Bearing of 0-degrees being "North", going clockwise.
    // Bump the radius if there's a lot.
    let radius = origins.radius;
    if (total > 12) {
      radius += (120 * (id % 3));
    }
    let x = origins.x + Math.sin(angleR) * radius;
    let y = origins.y - 30 - Math.cos(angleR) * radius;

    // Generate and radially arrange.
    let $n = generateNeighborNode(n);
    $n.appendTo($main);
    let anim_delay = id * kAnimDelay;
    $n.delay(anim_delay).queue(function() {
      setParticleCoordinates($(this), x, y);
      $(this).addClass('placed');
    });
    // let anim_delay = Math.random() * 300;
    attachInteraction($n);
  });
}

// General entry point for reception of the MediaWiki API.
// Since some data will require continuations, this will handle the async pulls.
function parseAPIdata(id, data) {
  maindata = data;
  generateCenter(data);

  // Figure out all the neighbors for the first level,
  // and filter out links we don't care about.
  let neighbors = [];
  neighbors = neighbors
    .concat(data.links)
    .concat(data.linkshere);
  neighbors = neighbors.filter(function(e) {
    // return !(e.redirect !== undefined) &&
    return !(e.pageid == maindata.pageid);
  });

  // Parse neighbor nodes and have basic info ready.
  // TODO: make it do backlinks and forward links
  arrangeNeighbors(neighbors);
}

/* Aesthetics - related nodes shall relate radially from the central node, the
 * current page. The nodes shall be evenly distributed among the angle of
 * neighbor, centered south.
 * As the number of nodes increases, the total angle approaches 2:00 and 10:00, like
 * BM.
 */
function _radialPosition(angle) {
}

// Generate or select the DOM element corresponding to the neighbor node,
// and position it in the appropriate spot.
// Sometimes the neighbor node is missing a pageid due to the MediaWiki API's
// inconsistency. In this case, create a temporary id prefixed by 't', and
// update the pageid when it's found.
function generateNeighborNode(data, $node) {
  if (!$node) {
    $node = $('<div class="pane small"></div>');
  } else {
    $node.removeClass('center');
    $node.removeClass('radiation');
    $node.addClass('small');
  }
  // Have the neighbor node begin somewhere reasonable.
  setParticleCoordinates($node, origins.x, origins.y);
  // let gen = '<div class="pane small"' +
      // 'style="left:' + origins.x +
            // ';top:'+origins.y+'">' +
  let txt = data.title.replace(' ','<br/>');
  let gen = '<div class="label">' + txt + '</div>';

  // Add to main collection.
  if (!data.pageid) {
    console.log('Missing pageid.');
    data.pageid = 't' + nextId++;
  }

  $node.data = data; // Attach original API data reference.
  gLevelOne[data.pageid] = $node;
  $node.html(gen);
  return $node;
}

// Helper which just sets the target coordinate (px) of an element.
// The particle will animate there based on CSS.
function setParticleCoordinates(p, x, y) {
  $(p).css('left', x);
  $(p).css('top', y);
}

/*
  Send all level / neighbor particles into background radiation.
*/
function radiate() {
  // Age the current universe, and phase out old particles.
  $.each(universe, function(id, n) {
    if (!n) { return; }
    n.expiry--;
    if (n.expiry <= 0) {
      console.log('expired');
      $(n).remove();
      delete universe[id];
    }
  });

  // Take current 1st level gLevelOne and prepare them as radiation particles.
  // The first time a particle goes into radiation, it must prepare for brownian
  // motion and expiry.
  $.each(gLevelOne, function(id, n) {
    if (!n) { return; }
    $n = $(n);
    $n.removeClass('small');
    $n.addClass('radiation');
    // Randomize particle location.
    let r = Math.random() * origins.radius * 1.8;
    let a = Math.random() * 2 * Math.PI;
    let x = origins.x + Math.sin(a) * r;
    let y = origins.y - Math.cos(a) * r;

    function _brownian() {
      // let r = Math.random() * origins.radius * 1.8;
      // let a = Math.random() * 2 * Math.PI;
      let x = origins.width * Math.random();
      let y = origins.height * Math.random();
      setParticleCoordinates(n, x, y);
      n.delay(2500 + Math.random() * 5000).queue(_brownian);
      setTimeout(_brownian, 2500 + Math.random() * 5000);
    }

    setParticleCoordinates(n, x, y);
    universe = Object.assign(universe, gLevelOne);
    n.expiry = 3;
    setTimeout(function() {
      n.addClass('star');
      _brownian();
    });
    // console.log(universe[n.data.pageid]);
    gLevelOne = {}; // Clear first level.
  });

}

function brownianMotion() {
}

// Setup click interactions.
// Primary interaction is to focus on the new data node,
// while causing previous neighbor nodes to radiate out into the universe.
function attachInteraction($n) {
  $n.click(function(e) {
    console.log('CLICKED NEIGHBOR', $n);
    // Prepare to promote current child to center.
    $(this).off('click');
    $pending = $(this);
    delete gLevelOne[$n.data.pageid];
    setParticleCoordinates($pending, origins.x, origins.y - origins.radius);
    // Radiate the current center into the universe.
    $demoted = generateNeighborNode(maindata, $center);
    setParticleCoordinates($demoted, origins.x, origins.y - origins.radius*0.3);
    radiate();

    // Delay the new page examination / load slightly.
    setTimeout(function() {
      $pending.removeClass('small');
      $pending.addClass('center');
      examineNode($n.data);
    }, 420);
  });
}

/* Refresh screen dimensions, which are necessary for positioning maths. */
function parseDimensions() {
  px_width  = window.innerWidth;
  px_height = window.innerHeight;
  return {
    x: px_width / 2,
    y: px_height / 2,
    radius: Math.min(px_width, px_height) * 0.33,
    width: px_width,
    height: px_height,
  };
}

/* Primary function which handles shifting the view to a new node.
returns True or success.
*/
function examineNode(data) {
  let id = '' + data.pageid;
  console.log(data);
  if (id.startsWith('t')) {
    // This node does not have a pageid yet, so we have to search by Title
    // instead.
    let title = data.title;
    if (!title) {
      return false;
    }
    fetchPageByTitle(data.title);
    return;
  }
  // Default operation uses pageids.
  fetchPageID(id)
  return true;
}

$(document).ready(function() {
  // ORiginal page:
  // let first = 27667;
  let spacetime = 28758;
  // let boganyi = 12765628;
  $(this).delay(10).queue(function() {
    fetchPageID(spacetime);
  });
});
