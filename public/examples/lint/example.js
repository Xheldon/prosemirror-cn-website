(function (prosemirrorView, prosemirrorState, prosemirrorModel, prosemirrorSchemaBasic, prosemirrorExampleSetup) {
  'use strict';

  // lint{
  // Words you probably shouldn't use
  const badWords = /\b(obviously|clearly|evidently|simply)\b/ig;
  // Matches punctuation with a space before it
  const badPunc = / ([,\.!?:]) ?/g;

  function lint(doc) {
    let result = [], lastHeadLevel = null;

    function record(msg, from, to, fix) {
      result.push({msg, from, to, fix});
    }

    // For each node in the document
    doc.descendants((node, pos) => {
      if (node.isText) {
        // Scan text nodes for suspicious patterns
        let m;
        while (m = badWords.exec(node.text))
          record(`Try not to say '${m[0]}'`,
                 pos + m.index, pos + m.index + m[0].length);
        while (m = badPunc.exec(node.text))
          record("Suspicious spacing around punctuation",
                 pos + m.index, pos + m.index + m[0].length,
                 fixPunc(m[1] + " "));
      } else if (node.type.name == "heading") {
        // Check whether heading levels fit under the current level
        let level = node.attrs.level;
        if (lastHeadLevel != null && level > lastHeadLevel + 1)
          record(`Heading too small (${level} under ${lastHeadLevel})`,
                 pos + 1, pos + 1 + node.content.size,
                 fixHeader(lastHeadLevel + 1));
        lastHeadLevel = level;
      } else if (node.type.name == "image" && !node.attrs.alt) {
        // Ensure images have alt text
        record("Image without alt text", pos, pos + 1, addAlt);
      }
    });

    return result
  }
  // }

  // fix{
  function fixPunc(replacement) {
    return function({state, dispatch}) {
      dispatch(state.tr.replaceWith(this.from, this.to,
                                    state.schema.text(replacement)));
    }
  }

  function fixHeader(level) {
    return function({state, dispatch}) {
      dispatch(state.tr.setNodeMarkup(this.from - 1, null, {level}));
    }
  }

  function addAlt({state, dispatch}) {
    let alt = prompt("Alt text", "");
    if (alt) {
      let attrs = Object.assign({}, state.doc.nodeAt(this.from).attrs, {alt});
      dispatch(state.tr.setNodeMarkup(this.from, null, attrs));
    }
  }

  function lintDeco(doc) {
    let decos = [];
    lint(doc).forEach(prob => {
      decos.push(prosemirrorView.Decoration.inline(prob.from, prob.to, {class: "problem"}),
                 prosemirrorView.Decoration.widget(prob.from, lintIcon(prob), {key: prob.msg}));
    });
    return prosemirrorView.DecorationSet.create(doc, decos)
  }

  function lintIcon(prob) {
    return () => {
      let icon = document.createElement("div");
      icon.className = "lint-icon";
      icon.title = prob.msg;
      icon.problem = prob;
      return icon
    }
  }

  let lintPlugin = new prosemirrorState.Plugin({
    state: {
      init(_, {doc}) { return lintDeco(doc) },
      apply(tr, old) { return tr.docChanged ? lintDeco(tr.doc) : old }
    },
    props: {
      decorations(state) { return this.getState(state) },
      handleClick(view, _, event) {
        if (/lint-icon/.test(event.target.className)) {
          let {from, to} = event.target.problem;
          view.dispatch(
            view.state.tr
              .setSelection(prosemirrorState.TextSelection.create(view.state.doc, from, to))
              .scrollIntoView());
          return true
        }
      },
      handleDoubleClick(view, _, event) {
        if (/lint-icon/.test(event.target.className)) {
          let prob = event.target.problem;
          if (prob.fix) {
            prob.fix(view);
            view.focus();
            return true
          }
        }
      }
    }
  });

  let state = prosemirrorState.EditorState.create({
    doc: prosemirrorModel.DOMParser.fromSchema(prosemirrorSchemaBasic.schema).parse(document.querySelector("#content")),
    plugins: prosemirrorExampleSetup.exampleSetup({schema: prosemirrorSchemaBasic.schema}).concat(lintPlugin)
  });

  window.view = new prosemirrorView.EditorView(document.querySelector("#editor"), {state});
  // }

})(PM.view, PM.state, PM.model, PM.schema_basic, PM.example_setup);

