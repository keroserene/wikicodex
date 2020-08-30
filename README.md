# wikicodex

A pure client-side knowledge-graph traversal visual interface which operates on the current, live Wikipedia.

![](img/wikicodex3.gif)

Check out the current live example:
<a href='http://serene.cx/wikicodex' target='_blank'>
  serene.cx/wikicodex
</a>

---

Wikipedia is a beautiful thing.
Parsing mountains of knowledge is tricky though.

So I hacked together this very simple client.
Though there've been plenty of Wikipedia visualizations,
I've not seen anyone make *this* -
something which is generalized to Wikipedia,
and simply lets you explore Wikipedia live, via graph traversal.

As an engineering constraint to keep this as simple and light-weight as
possible, this is pure client-side code. No servers, no state, nothing.
Definitely no bullshit accounts to sign up for :)

All it does is pull from the Wikipedia API, then just render the knowledge graph,
with  aesthetics sufficient to make it both easy to traverse and pretty.


### Keyboard Shortcuts

- SPACE / N - Enumerate Adjacent Nodes.
- ESC       - Minimize Current Node.
- ENTER / O - Open Full Wikipedia page.
- ? / H     - Toggle help panel.


### Interactions / Graph Traversal

Click or tap on a node to examine it.

Examining a node opens a summary with the current text excerpt
(plus primary image, if available.)

If you click on the main button below "Enumerate Adjacent Nodes",
the codex will load all relevant adjacent nodes for
that Wikipedia article and radially arrange them.
This reveals links and backlinks,
which you may also explore.

If a node has not been interacted with for a while, it gradually fades into
the background, and out of existence.

Any node is easily retrieved, as long as Wikipedia is up and you're
online.

Works better on larger screens, though workable on mobile.
More features may be included soon to refine the navigation and interactions.


### Current & Future Features

Just listing them here for myself.
There's lots of nice-to-have features I might get to as time allows,
But as is, the *essense* of this thing works great, and hacked together in
a day :)

- [x] Quickly access wikipedia API and open summaries of any Wikipedia node
- [x] Enumerate through neighboring articles and add to the graph.
- [x] Fade irrelevant nodes into oblivion with some color-coding.
- [x] Interface Scaling for different device sizes
- [ ] Breadcrumb navigation
- [ ] RANDOM and RESET
- [ ] General search function
- [ ] Bi-directional edge indications.
- [ ] Optimize performance for different browsers
- [ ] Expose sliders for node age expiry, max nodes, etc.
- [ ] Aesthetic updates and stuff...
- [ ] Pagination mechanism for radial expanding nodes with hundreds of neighbors
- [ ] Apply thumbnails to nodes when small.
- [ ] Additional metadata parsing.
- [ ] Generalize to be able to traverse arbitrary non-Wikipedia graph data
- [ ] And some other stuff...

I hope this tool might enhance your wikipedia tab-explosions.

---

Enjoy! <3

~serene

- @keroserene on github
- [@serenepianist](https://instagram.com/serenepianist) on IG
