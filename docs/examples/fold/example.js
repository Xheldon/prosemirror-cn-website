(function (prosemirrorModel, prosemirrorSchemaBasic, prosemirrorState, prosemirrorView, prosemirrorExampleSetup) {
  'use strict';

  // schema{

  const schema = new prosemirrorModel.Schema({
    nodes: prosemirrorSchemaBasic.schema.spec.nodes.append({
      doc: {
        content: "section+"
      },
      section: {
        content: "heading block+",
        parseDOM: [{tag: "section"}],
        toDOM() { return ["section", 0] }
      }
    }),
    marks: prosemirrorSchemaBasic.schema.spec.marks
  });
  // }

  // nodeview{
  class SectionView {
    constructor(node, view, getPos, deco) {
      this.dom = document.createElement("section");
      this.header = this.dom.appendChild(document.createElement("header"));
      this.header.contentEditable = "false"; 
      this.foldButton = this.header.appendChild(document.createElement("button"));
      this.foldButton.title = "Toggle section folding";
      this.foldButton.onmousedown = e => this.foldClick(view, getPos, e);
      this.contentDOM = this.dom.appendChild(document.createElement("div"));
      this.setFolded(deco.some(d => d.spec.foldSection));
    }

    setFolded(folded) {
      this.folded = folded;
      this.foldButton.textContent = folded ? "▿" : "▵";
      this.contentDOM.style.display = folded ? "none" : "";
    }

    update(node, deco) {
      if (node.type.name != "section") return false
      let folded = deco.some(d => d.spec.foldSection);
      if (folded != this.folded) this.setFolded(folded);
      return true
    }

    foldClick(view, getPos, event) {
      event.preventDefault();
      setFolding(view, getPos(), !this.folded);
    }
  }

  const foldPlugin = new prosemirrorState.Plugin({
    state: {
      init() { return prosemirrorView.DecorationSet.empty },
      apply(tr, value) {
        value = value.map(tr.mapping, tr.doc);
        let update = tr.getMeta(foldPlugin);
        if (update && update.fold) {
          let node = tr.doc.nodeAt(update.pos);
          if (node && node.type.name == "section")
            value = value.add(tr.doc, [prosemirrorView.Decoration.node(update.pos, update.pos + node.nodeSize, {}, {foldSection: true})]);
        } else if (update) {
          let found = value.find(update.pos + 1, update.pos + 1);
          if (found.length) value = value.remove(found);
        }
        return value
      }
    },
    props: {
      decorations: state => foldPlugin.getState(state),
      nodeViews: {section: (node, view, getPos, decorations) => new SectionView(node, view, getPos, decorations)}
    }
  });

  function setFolding(view, pos, fold) {
    let section = view.state.doc.nodeAt(pos);
    if (section && section.type.name == "section") {
      let tr = view.state.tr.setMeta(foldPlugin, {pos, fold});
      let {from, to} = view.state.selection, endPos = pos + section.nodeSize;
      if (from < endPos && to > pos) {
        let newSel = prosemirrorState.Selection.findFrom(view.state.doc.resolve(endPos), 1) ||
          prosemirrorState.Selection.findFrom(view.state.doc.resolve(pos), -1);
        if (newSel) tr.setSelection(newSel);
      }
      view.dispatch(tr);
    }
  }

  window.view = new prosemirrorView.EditorView(document.querySelector("#editor"), {
    state: prosemirrorState.EditorState.create({
      doc: schema.node("doc", null, [
        schema.node("section", null, [
          schema.node("heading", {level: 1}, [schema.text("One")]),
          schema.node("paragraph", null, [schema.text("This is the first section. Click the top right corner to collapse it.")])
        ]),
        schema.node("section", null, [
          schema.node("heading", {level: 1}, [schema.text("Two")]),
          schema.node("paragraph", null, [schema.text("Here's another section.")])
        ])
      ]),
      plugins: prosemirrorExampleSetup.exampleSetup({schema}).concat(foldPlugin)
    })
  });
  // }

})(PM.model, PM.schema_basic, PM.state, PM.view, PM.example_setup);

