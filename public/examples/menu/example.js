(function (prosemirrorState, prosemirrorCommands, prosemirrorSchemaBasic, prosemirrorView, prosemirrorKeymap, prosemirrorModel) {
  'use strict';

  // MenuView{
  class MenuView {
    constructor(items, editorView) {
      this.items = items;
      this.editorView = editorView;

      this.dom = document.createElement("div");
      this.dom.className = "menubar";
      items.forEach(({dom}) => this.dom.appendChild(dom));
      this.update();

      this.dom.addEventListener("mousedown", e => {
        e.preventDefault();
        editorView.focus();
        items.forEach(({command, dom}) => {
          if (dom.contains(e.target))
            command(editorView.state, editorView.dispatch, editorView);
        });
      });
    }

    update() {
      this.items.forEach(({command, dom}) => {
        let active = command(this.editorView.state, null, this.editorView);
        dom.style.display = active ? "" : "none";
      });
    }

    destroy() { this.dom.remove(); }
  }

  function menuPlugin(items) {
    return new prosemirrorState.Plugin({
      view(editorView) {
        let menuView = new MenuView(items, editorView);
        editorView.dom.parentNode.insertBefore(menuView.dom, editorView.dom);
        return menuView
      }
    })
  }

  // Helper function to create menu icons
  function icon(text, name) {
    let span = document.createElement("span");
    span.className = "menuicon " + name;
    span.title = name;
    span.textContent = text;
    return span
  }

  // Create an icon for a heading at the given level
  function heading(level) {
    return {
      command: prosemirrorCommands.setBlockType(prosemirrorSchemaBasic.schema.nodes.heading, {level}),
      dom: icon("H" + level, "heading")
    }
  }

  let menu = menuPlugin([
    {command: prosemirrorCommands.toggleMark(prosemirrorSchemaBasic.schema.marks.strong), dom: icon("B", "strong")},
    {command: prosemirrorCommands.toggleMark(prosemirrorSchemaBasic.schema.marks.em), dom: icon("i", "em")},
    {command: prosemirrorCommands.setBlockType(prosemirrorSchemaBasic.schema.nodes.paragraph), dom: icon("p", "paragraph")},
    heading(1), heading(2), heading(3),
    {command: prosemirrorCommands.wrapIn(prosemirrorSchemaBasic.schema.nodes.blockquote), dom: icon(">", "blockquote")}
  ]);

  window.view = new prosemirrorView.EditorView(document.querySelector("#editor"), {
    state: prosemirrorState.EditorState.create({
      doc: prosemirrorModel.DOMParser.fromSchema(prosemirrorSchemaBasic.schema).parse(document.querySelector("#content")),
      plugins: [prosemirrorKeymap.keymap(prosemirrorCommands.baseKeymap), menu]
    })
  });

})(PM.state, PM.commands, PM.schema_basic, PM.view, PM.keymap, PM.model);

