(function (prosemirrorExampleSetup, prosemirrorTransform, prosemirrorState, prosemirrorView, prosemirrorHistory, prosemirrorMenu, require$$0, require$$1, require$$2) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0);
    var require$$1__default = /*#__PURE__*/_interopDefaultLegacy(require$$1);
    var require$$2__default = /*#__PURE__*/_interopDefaultLegacy(require$$2);

    class Rebaseable {
        constructor(step, inverted, origin) {
            this.step = step;
            this.inverted = inverted;
            this.origin = origin;
        }
    }
    /**
    Undo a given set of steps, apply a set of other steps, and then
    redo them @internal
    */
    function rebaseSteps(steps, over, transform) {
        for (let i = steps.length - 1; i >= 0; i--)
            transform.step(steps[i].inverted);
        for (let i = 0; i < over.length; i++)
            transform.step(over[i]);
        let result = [];
        for (let i = 0, mapFrom = steps.length; i < steps.length; i++) {
            let mapped = steps[i].step.map(transform.mapping.slice(mapFrom));
            mapFrom--;
            if (mapped && !transform.maybeStep(mapped).failed) {
                transform.mapping.setMirror(mapFrom, transform.steps.length - 1);
                result.push(new Rebaseable(mapped, mapped.invert(transform.docs[transform.docs.length - 1]), steps[i].origin));
            }
        }
        return result;
    }
    // This state field accumulates changes that have to be sent to the
    // central authority in the collaborating group and makes it possible
    // to integrate changes made by peers into our local document. It is
    // defined by the plugin, and will be available as the `collab` field
    // in the resulting editor state.
    class CollabState {
        constructor(
        // The version number of the last update received from the central
        // authority. Starts at 0 or the value of the `version` property
        // in the option object, for the editor's value when the option
        // was enabled.
        version, 
        // The local steps that havent been successfully sent to the
        // server yet.
        unconfirmed) {
            this.version = version;
            this.unconfirmed = unconfirmed;
        }
    }
    function unconfirmedFrom(transform) {
        let result = [];
        for (let i = 0; i < transform.steps.length; i++)
            result.push(new Rebaseable(transform.steps[i], transform.steps[i].invert(transform.docs[i]), transform));
        return result;
    }
    const collabKey = new prosemirrorState.PluginKey("collab");
    /**
    Creates a plugin that enables the collaborative editing framework
    for the editor.
    */
    function collab(config = {}) {
        let conf = {
            version: config.version || 0,
            clientID: config.clientID == null ? Math.floor(Math.random() * 0xFFFFFFFF) : config.clientID
        };
        return new prosemirrorState.Plugin({
            key: collabKey,
            state: {
                init: () => new CollabState(conf.version, []),
                apply(tr, collab) {
                    let newState = tr.getMeta(collabKey);
                    if (newState)
                        return newState;
                    if (tr.docChanged)
                        return new CollabState(collab.version, collab.unconfirmed.concat(unconfirmedFrom(tr)));
                    return collab;
                }
            },
            config: conf,
            // This is used to notify the history plugin to not merge steps,
            // so that the history can be rebased.
            historyPreserveItems: true
        });
    }
    /**
    Create a transaction that represents a set of new steps received from
    the authority. Applying this transaction moves the state forward to
    adjust to the authority's view of the document.
    */
    function receiveTransaction(state, steps, clientIDs, options = {}) {
        // Pushes a set of steps (received from the central authority) into
        // the editor state (which should have the collab plugin enabled).
        // Will recognize its own changes, and confirm unconfirmed steps as
        // appropriate. Remaining unconfirmed steps will be rebased over
        // remote steps.
        let collabState = collabKey.getState(state);
        let version = collabState.version + steps.length;
        let ourID = collabKey.get(state).spec.config.clientID;
        // Find out which prefix of the steps originated with us
        let ours = 0;
        while (ours < clientIDs.length && clientIDs[ours] == ourID)
            ++ours;
        let unconfirmed = collabState.unconfirmed.slice(ours);
        steps = ours ? steps.slice(ours) : steps;
        // If all steps originated with us, we're done.
        if (!steps.length)
            return state.tr.setMeta(collabKey, new CollabState(version, unconfirmed));
        let nUnconfirmed = unconfirmed.length;
        let tr = state.tr;
        if (nUnconfirmed) {
            unconfirmed = rebaseSteps(unconfirmed, steps, tr);
        }
        else {
            for (let i = 0; i < steps.length; i++)
                tr.step(steps[i]);
            unconfirmed = [];
        }
        let newCollabState = new CollabState(version, unconfirmed);
        if (options && options.mapSelectionBackward && state.selection instanceof prosemirrorState.TextSelection) {
            tr.setSelection(prosemirrorState.TextSelection.between(tr.doc.resolve(tr.mapping.map(state.selection.anchor, -1)), tr.doc.resolve(tr.mapping.map(state.selection.head, -1)), -1));
            tr.updated &= ~1;
        }
        return tr.setMeta("rebased", nUnconfirmed).setMeta("addToHistory", false).setMeta(collabKey, newCollabState);
    }
    /**
    Provides data describing the editor's unconfirmed steps, which need
    to be sent to the central authority. Returns null when there is
    nothing to send.

    `origins` holds the _original_ transactions that produced each
    steps. This can be useful for looking up time stamps and other
    metadata for the steps, but note that the steps may have been
    rebased, whereas the origin transactions are still the old,
    unchanged objects.
    */
    function sendableSteps(state) {
        let collabState = collabKey.getState(state);
        if (collabState.unconfirmed.length == 0)
            return null;
        return {
            version: collabState.version,
            steps: collabState.unconfirmed.map(s => s.step),
            clientID: collabKey.get(state).spec.config.clientID,
            get origins() {
                return this._origins || (this._origins = collabState.unconfirmed.map(s => s.origin));
            }
        };
    }
    /**
    Get the version up to which the collab plugin has synced with the
    central authority.
    */
    function getVersion(state) {
        return collabKey.getState(state).version;
    }

    function crelt() {
      var elt = arguments[0];
      if (typeof elt == "string") elt = document.createElement(elt);
      var i = 1, next = arguments[1];
      if (next && typeof next == "object" && next.nodeType == null && !Array.isArray(next)) {
        for (var name in next) if (Object.prototype.hasOwnProperty.call(next, name)) {
          var value = next[name];
          if (typeof value == "string") elt.setAttribute(name, value);
          else if (value != null) elt[name] = value;
        }
        i++;
      }
      for (; i < arguments.length; i++) add(elt, arguments[i]);
      return elt
    }

    function add(elt, child) {
      if (typeof child == "string") {
        elt.appendChild(document.createTextNode(child));
      } else if (child == null) ; else if (child.nodeType != null) {
        elt.appendChild(child);
      } else if (Array.isArray(child)) {
        for (var i = 0; i < child.length; i++) add(elt, child[i]);
      } else {
        throw new RangeError("Unsupported child node: " + child)
      }
    }

    const {Schema} = require$$0__default["default"];
    const {schema: base} = require$$1__default["default"];
    const {addListNodes} = require$$2__default["default"];

    var schema_1 = new Schema({
      nodes: addListNodes(base.spec.nodes, "paragraph block*", "block"),
      marks: base.spec.marks
    });

    // A simple wrapper for XHR.
    function req(conf) {
      let req = new XMLHttpRequest(), aborted = false;
      let result = new Promise((success, failure) => {
        req.open(conf.method, conf.url, true);
        req.addEventListener("load", () => {
          if (aborted) return
          if (req.status < 400) {
            success(req.responseText);
          } else {
            let text = req.responseText;
            if (text && /html/.test(req.getResponseHeader("content-type"))) text = makePlain(text);
            let err = new Error("Request failed: " + req.statusText + (text ? "\n\n" + text : ""));
            err.status = req.status;
            failure(err);
          }
        });
        req.addEventListener("error", () => { if (!aborted) failure(new Error("Network error")); });
        if (conf.headers) for (let header in conf.headers) req.setRequestHeader(header, conf.headers[header]);
        req.send(conf.body || null);
      });
      result.abort = () => {
        if (!aborted) {
          req.abort();
          aborted = true;
        }
      };
      return result
    }

    function makePlain(html) {
      var elt = document.createElement("div");
      elt.innerHTML = html;
      return elt.textContent.replace(/\n[^]*|\s+$/g, "")
    }

    function GET(url) {
      return req({url, method: "GET"})
    }

    function POST(url, body, type) {
      return req({url, method: "POST", body, headers: {"Content-Type": type}})
    }

    class Reporter {
      constructor() {
        this.state = this.node = null;
        this.setAt = 0;
      }

      clearState() {
        if (this.state) {
          document.body.removeChild(this.node);
          this.state = this.node = null;
          this.setAt = 0;
        }
      }

      failure(err) {
        this.show("fail", err.toString());
      }

      delay(err) {
        if (this.state == "fail") return
        this.show("delay", err.toString());
      }

      show(type, message) {
        this.clearState();
        this.state = type;
        this.setAt = Date.now();
        this.node = document.body.appendChild(document.createElement("div"));
        this.node.className = "ProseMirror-report ProseMirror-report-" + type;
        this.node.textContent = message;
      }

      success() {
        if (this.state == "fail" && this.setAt > Date.now() - 1000 * 10)
          setTimeout(() => this.success(), 5000);
        else
          this.clearState();
      }
    }

    class Comment {
      constructor(text, id) {
        this.id = id;
        this.text = text;
      }
    }

    function deco(from, to, comment) {
      return prosemirrorView.Decoration.inline(from, to, {class: "comment"}, {comment})
    }

    class CommentState {
      constructor(version, decos, unsent) {
        this.version = version;
        this.decos = decos;
        this.unsent = unsent;
      }

      findComment(id) {
        let current = this.decos.find();
        for (let i = 0; i < current.length; i++)
          if (current[i].spec.comment.id == id) return current[i]
      }

      commentsAt(pos) {
        return this.decos.find(pos, pos)
      }

      apply(tr) {
        let action = tr.getMeta(commentPlugin), actionType = action && action.type;
        if (!action && !tr.docChanged) return this
        let base = this;
        if (actionType == "receive") base = base.receive(action, tr.doc);
        let decos = base.decos, unsent = base.unsent;
        decos = decos.map(tr.mapping, tr.doc);
        if (actionType == "newComment") {
          decos = decos.add(tr.doc, [deco(action.from, action.to, action.comment)]);
          unsent = unsent.concat(action);
        } else if (actionType == "deleteComment") {
          decos = decos.remove([this.findComment(action.comment.id)]);
          unsent = unsent.concat(action);
        }
        return new CommentState(base.version, decos, unsent)
      }

      receive({version, events, sent}, doc) {
        let set = this.decos;
        for (let i = 0; i < events.length; i++) {
          let event = events[i];
          if (event.type == "delete") {
            let found = this.findComment(event.id);
            if (found) set = set.remove([found]);
          } else { // "create"
            if (!this.findComment(event.id))
              set = set.add(doc, [deco(event.from, event.to, new Comment(event.text, event.id))]);
          }
        }
        return new CommentState(version, set, this.unsent.slice(sent))
      }

      unsentEvents() {
        let result = [];
        for (let i = 0; i < this.unsent.length; i++) {
          let action = this.unsent[i];
          if (action.type == "newComment") {
            let found = this.findComment(action.comment.id);
            if (found) result.push({type: "create", id: action.comment.id,
                                    from: found.from, to: found.to,
                                    text: action.comment.text});
          } else {
            result.push({type: "delete", id: action.comment.id});
          }
        }
        return result
      }

      static init(config) {
        let decos = config.comments.comments.map(c => deco(c.from, c.to, new Comment(c.text, c.id)));
        return new CommentState(config.comments.version, prosemirrorView.DecorationSet.create(config.doc, decos), [])
      }
    }

    const commentPlugin = new prosemirrorState.Plugin({
      state: {
        init: CommentState.init,
        apply(tr, prev) { return prev.apply(tr) }
      },
      props: {
        decorations(state) { return this.getState(state).decos }
      }
    });

    function randomID() {
      return Math.floor(Math.random() * 0xffffffff)
    }

    // Command for adding an annotation

    const addAnnotation = function(state, dispatch) {
      let sel = state.selection;
      if (sel.empty) return false
      if (dispatch) {
        let text = prompt("Annotation text", "");
        if (text)
          dispatch(state.tr.setMeta(commentPlugin, {type: "newComment", from: sel.from, to: sel.to, comment: new Comment(text, randomID())}));
      }
      return true
    };

    const annotationIcon = {
      width: 1024, height: 1024,
      path: "M512 219q-116 0-218 39t-161 107-59 145q0 64 40 122t115 100l49 28-15 54q-13 52-40 98 86-36 157-97l24-21 32 3q39 4 74 4 116 0 218-39t161-107 59-145-59-145-161-107-218-39zM1024 512q0 99-68 183t-186 133-257 48q-40 0-82-4-113 100-262 138-28 8-65 12h-2q-8 0-15-6t-9-15v-0q-1-2-0-6t1-5 2-5l3-5t4-4 4-5q4-4 17-19t19-21 17-22 18-29 15-33 14-43q-89-50-141-125t-51-160q0-99 68-183t186-133 257-48 257 48 186 133 68 183z"
    };

    // Comment UI

    const commentUI = function(dispatch) {
      return new prosemirrorState.Plugin({
        props: {
          decorations(state) {
            return commentTooltip(state, dispatch)
          }
        }
      })
    };

    function commentTooltip(state, dispatch) {
      let sel = state.selection;
      if (!sel.empty) return null
      let comments = commentPlugin.getState(state).commentsAt(sel.from);
      if (!comments.length) return null
      return prosemirrorView.DecorationSet.create(state.doc, [prosemirrorView.Decoration.widget(sel.from, renderComments(comments, dispatch, state))])
    }

    function renderComments(comments, dispatch, state) {
      return crelt("div", {class: "tooltip-wrapper"},
                  crelt("ul", {class: "commentList"},
                       comments.map(c => renderComment(c.spec.comment, dispatch, state))))
    }

    function renderComment(comment, dispatch, state) {
      let btn = crelt("button", {class: "commentDelete", title: "Delete annotation"}, "×");
      btn.addEventListener("click", () =>
        dispatch(state.tr.setMeta(commentPlugin, {type: "deleteComment", comment}))
      );
      return crelt("li", {class: "commentText"}, comment.text, btn)
    }

    const report = new Reporter();

    function badVersion(err) {
      return err.status == 400 && /invalid version/i.test(err)
    }

    class State {
      constructor(edit, comm) {
        this.edit = edit;
        this.comm = comm;
      }
    }

    class EditorConnection {
      constructor(report, url) {
        this.report = report;
        this.url = url;
        this.state = new State(null, "start");
        this.request = null;
        this.backOff = 0;
        this.view = null;
        this.dispatch = this.dispatch.bind(this);
        this.start();
      }

      // All state changes go through this
      dispatch(action) {
        let newEditState = null;
        if (action.type == "loaded") {
          info.users.textContent = userString(action.users); // FIXME ewww
          let editState = prosemirrorState.EditorState.create({
            doc: action.doc,
            plugins: prosemirrorExampleSetup.exampleSetup({schema: schema_1, history: false, menuContent: menu.fullMenu}).concat([
              prosemirrorHistory.history(),
              collab({version: action.version}),
              commentPlugin,
              commentUI(transaction => this.dispatch({type: "transaction", transaction}))
            ]),
            comments: action.comments
          });
          this.state = new State(editState, "poll");
          this.poll();
        } else if (action.type == "restart") {
          this.state = new State(null, "start");
          this.start();
        } else if (action.type == "poll") {
          this.state = new State(this.state.edit, "poll");
          this.poll();
        } else if (action.type == "recover") {
          if (action.error.status && action.error.status < 500) {
            this.report.failure(action.error);
            this.state = new State(null, null);
          } else {
            this.state = new State(this.state.edit, "recover");
            this.recover(action.error);
          }
        } else if (action.type == "transaction") {
          newEditState = this.state.edit.apply(action.transaction);
        }

        if (newEditState) {
          let sendable;
          if (newEditState.doc.content.size > 40000) {
            if (this.state.comm != "detached") this.report.failure("Document too big. Detached.");
            this.state = new State(newEditState, "detached");
          } else if ((this.state.comm == "poll" || action.requestDone) && (sendable = this.sendable(newEditState))) {
            this.closeRequest();
            this.state = new State(newEditState, "send");
            this.send(newEditState, sendable);
          } else if (action.requestDone) {
            this.state = new State(newEditState, "poll");
            this.poll();
          } else {
            this.state = new State(newEditState, this.state.comm);
          }
        }

        // Sync the editor with this.state.edit
        if (this.state.edit) {
          if (this.view)
            this.view.updateState(this.state.edit);
          else
            this.setView(new prosemirrorView.EditorView(document.querySelector("#editor"), {
              state: this.state.edit,
              dispatchTransaction: transaction => this.dispatch({type: "transaction", transaction})
            }));
        } else this.setView(null);
      }

      // Load the document from the server and start up
      start() {
        this.run(GET(this.url)).then(data => {
          data = JSON.parse(data);
          this.report.success();
          this.backOff = 0;
          this.dispatch({type: "loaded",
                         doc: schema_1.nodeFromJSON(data.doc),
                         version: data.version,
                         users: data.users,
                         comments: {version: data.commentVersion, comments: data.comments}});
        }, err => {
          this.report.failure(err);
        });
      }

      // Send a request for events that have happened since the version
      // of the document that the client knows about. This request waits
      // for a new version of the document to be created if the client
      // is already up-to-date.
      poll() {
        let query = "version=" + getVersion(this.state.edit) + "&commentVersion=" + commentPlugin.getState(this.state.edit).version;
        this.run(GET(this.url + "/events?" + query)).then(data => {
          this.report.success();
          data = JSON.parse(data);
          this.backOff = 0;
          if (data.steps && (data.steps.length || data.comment.length)) {
            let tr = receiveTransaction(this.state.edit, data.steps.map(j => prosemirrorTransform.Step.fromJSON(schema_1, j)), data.clientIDs);
            tr.setMeta(commentPlugin, {type: "receive", version: data.commentVersion, events: data.comment, sent: 0});
            this.dispatch({type: "transaction", transaction: tr, requestDone: true});
          } else {
            this.poll();
          }
          info.users.textContent = userString(data.users);
        }, err => {
          if (err.status == 410 || badVersion(err)) {
            // Too far behind. Revert to server state
            this.report.failure(err);
            this.dispatch({type: "restart"});
          } else if (err) {
            this.dispatch({type: "recover", error: err});
          }
        });
      }

      sendable(editState) {
        let steps = sendableSteps(editState);
        let comments = commentPlugin.getState(editState).unsentEvents();
        if (steps || comments.length) return {steps, comments}
      }

      // Send the given steps to the server
      send(editState, {steps, comments}) {
        let json = JSON.stringify({version: getVersion(editState),
                                   steps: steps ? steps.steps.map(s => s.toJSON()) : [],
                                   clientID: steps ? steps.clientID : 0,
                                   comment: comments || []});
        this.run(POST(this.url + "/events", json, "application/json")).then(data => {
          this.report.success();
          this.backOff = 0;
          let tr = steps
              ? receiveTransaction(this.state.edit, steps.steps, repeat(steps.clientID, steps.steps.length))
              : this.state.edit.tr;
          tr.setMeta(commentPlugin, {type: "receive", version: JSON.parse(data).commentVersion, events: [], sent: comments.length});
          this.dispatch({type: "transaction", transaction: tr, requestDone: true});
        }, err => {
          if (err.status == 409) {
            // The client's document conflicts with the server's version.
            // Poll for changes and then try again.
            this.backOff = 0;
            this.dispatch({type: "poll"});
          } else if (badVersion(err)) {
            this.report.failure(err);
            this.dispatch({type: "restart"});
          } else {
            this.dispatch({type: "recover", error: err});
          }
        });
      }

      // Try to recover from an error
      recover(err) {
        let newBackOff = this.backOff ? Math.min(this.backOff * 2, 6e4) : 200;
        if (newBackOff > 1000 && this.backOff < 1000) this.report.delay(err);
        this.backOff = newBackOff;
        setTimeout(() => {
          if (this.state.comm == "recover") this.dispatch({type: "poll"});
        }, this.backOff);
      }

      closeRequest() {
        if (this.request) {
          this.request.abort();
          this.request = null;
        }
      }

      run(request) {
        return this.request = request
      }

      close() {
        this.closeRequest();
        this.setView(null);
      }

      setView(view) {
        if (this.view) this.view.destroy();
        this.view = window.view = view;
      }
    }

    function repeat(val, n) {
      let result = [];
      for (let i = 0; i < n; i++) result.push(val);
      return result
    }

    const annotationMenuItem = new prosemirrorMenu.MenuItem({
      title: "Add an annotation",
      run: addAnnotation,
      select: state => addAnnotation(state),
      icon: annotationIcon
    });
    let menu = prosemirrorExampleSetup.buildMenuItems(schema_1);
    menu.fullMenu[0].push(annotationMenuItem);

    let info = {
      name: document.querySelector("#docname"),
      users: document.querySelector("#users")
    };
    document.querySelector("#changedoc").addEventListener("click", e => {
      GET("/collab-backend/docs/").then(data => showDocList(e.target, JSON.parse(data)),
                                        err => report.failure(err));
    });

    function userString(n) {
      return "(" + n + " user" + (n == 1 ? "" : "s") + ")"
    }

    let docList;
    function showDocList(node, list) {
      if (docList) docList.parentNode.removeChild(docList);

      let ul = docList = document.body.appendChild(crelt("ul", {class: "doclist"}));
      list.forEach(doc => {
        ul.appendChild(crelt("li", {"data-name": doc.id},
                            doc.id + " " + userString(doc.users)));
      });
      ul.appendChild(crelt("li", {"data-new": "true", style: "border-top: 1px solid silver; margin-top: 2px"},
                          "Create a new document"));

      let rect = node.getBoundingClientRect();
      ul.style.top = (rect.bottom + 10 + pageYOffset - ul.offsetHeight) + "px";
      ul.style.left = (rect.left - 5 + pageXOffset) + "px";

      ul.addEventListener("click", e => {
        if (e.target.nodeName == "LI") {
          ul.parentNode.removeChild(ul);
          docList = null;
          if (e.target.hasAttribute("data-name"))
            location.hash = "#edit-" + encodeURIComponent(e.target.getAttribute("data-name"));
          else
            newDocument();
        }
      });
    }
    document.addEventListener("click", () => {
      if (docList) {
        docList.parentNode.removeChild(docList);
        docList = null;
      }
    });

    function newDocument() {
      let name = prompt("Name the new document", "");
      if (name)
        location.hash = "#edit-" + encodeURIComponent(name);
    }

    let connection = null;

    function connectFromHash() {
      let isID = /^#edit-(.+)/.exec(location.hash);
      if (isID) {
        if (connection) connection.close();
        info.name.textContent = decodeURIComponent(isID[1]);
        connection = window.connection = new EditorConnection(report, "/collab-backend/docs/" + isID[1]);
        connection.request.then(() => connection.view.focus());
        return true
      }
    }

    addEventListener("hashchange", connectFromHash);
    connectFromHash() || (location.hash = "#edit-Example");

})(PM.example_setup, PM.transform, PM.state, PM.view, PM.history, PM.menu, PM.model, PM.schema_basic, PM.schema_list);

