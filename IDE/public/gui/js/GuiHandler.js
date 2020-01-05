import * as utils from './utils.js'

export default class GuiHandler {
  constructor(bela, parentId='gui') {
    this.bela = bela;
    this.parentId = parentId;
    this.parentEl = document.getElementById(this.parentId);
    this.project = null;
    this.sketchName = 'sketch';
    this.iframeId = 'gui-iframe';
    this.iframeEl = null;
    this.resources = ["../js/p5.min.js", "../js/p5.dom.min.js"];

    this.placeholder = {
      css: `
        font-size:30px;
        font-family:courier;
        text-align: center;
        vertical-align: middle;
        background-color:
        rgba(28, 232, 181, 0.5);
      `,
      html: `
        <h2>BELA P5 GUI</h2>
        <p>In order to use the GUI functionality in Bela</p>
        <p>you need to use the GUI library</p>
        <p>and include a sketch.js file (p5 sketch) in your project.</p>
        <p>(Your project will need to be running for the GUI to be accessible).</p>
      `
    }

    this.setPlaceholder(this.placeholder.css, this.placeholder.html);
    window.onload = this.selectProject();
  }

  setPlaceholder(css, html) {
    this.parentEl.innerHTML = html;
    this.parentEl.style.cssText = css;
  }

  clearPlaceholder() {
    this.parentEl.innerHTML = "";
    this.parentEl.style.cssText = "";
  }

  onNewConnection(event) {
      console.log('onNewConnection');
      let projName = event.detail.projectName;
      if(projName != null)
      {
          if(event.target.resolve) {
              event.target.resolve(projName);
          } else {
              window.GuiHandler.selectGui(projName);
          }
      }
  }

  getProjectName() {
      console.log('getProjectName');
      let that = this;
      let promise = new Promise(function(resolve, reject) {
          let projName = null;
          history.replaceState(null, null, ' ');

          let queryString = new URLSearchParams(window.location.search);
          if(queryString.has('project'))
              projName = queryString.get('project');

          projName = projName || that.bela.control.projectName;

          that.bela.control.target.addEventListener('new-connection', that.onNewConnection);
          that.bela.control.target.resolve = resolve;

          if(projName != null)
              resolve(projName);
      });
      return promise;
  }

  selectProject () {
      console.log('selectProject');
      this.getProjectName().then((projectName) => {
          console.log(projectName);
          if(projectName != "null") {
              this.project = projectName;
              this.selectGui(this.project)
          }
      });
  }

  createIframe(source) {
    let iframe = $('<iframe/>', {
      id:           this.iframeId,
      src:          source,
      style:        "position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;",
      scrolling:    "no",
      frameborder:  "0"
    }).appendTo("#"+this.parentId);
    return iframe.get( 0 );
  }

  loadIframeResources(iframe) {
    var p = Promise.resolve();

    this.resources.forEach((r) => {
      p = p.then(() => utils.loadScript(r, "head", iframe.contentWindow.document));
    });
    iframe.contentWindow.Bela = Bela;
    iframe.contentWindow.utils = utils;
    return p;
  }

  selectGui(projectName) {
      console.log("selectGui");

      // Remove iframe
      if(this.iframeEl != null) {
        this.iframeEl.parentNode.removeChild(this.iframeEl);
        this.iframeEl = null;
      }
      let that = this;
      this.project = projectName;

      if(this.project != "exampleTempProject" && this.project != null)
      {
          window.location.hash = '#'+this.project;
      } else {
          history.replaceState(null, null, ' ');
      }

      that.bela.control.target.removeEventListener('new-connection', that.onNewConnection);

      let htmlLocation = "/projects/"+projectName+"/main.html";
      utils.getHtml(htmlLocation)
      .then((val) => {
        console.log("Load HTML file on iFrame...")
        this.clearPlaceholder();
        this.iframeEl = this.createIframe("/gui/gui-template.html");
        let htmlContent = val;
        this.iframeEl.onload = () => {
          this.iframeEl.contentWindow.postMessage(htmlContent);
        };
      })
      .catch((err) => {
        console.log("HTML not loaded...");
        console.log("... try loading script");
        this.clearPlaceholder();

        this.iframeEl = this.createIframe("/gui/gui-template.html");
        this.iframeEl.onload = () => {
          this.loadSketch(this.project, 'head', this.iframeEl.contentWindow.document);
        };
      });

      that.bela.control.target.addEventListener('new-connection', that.onNewConnection);
      that.bela.control.target.resolve = null;
  }

  loadSketch(projectName, parentSection, dom, sketchName='sketch', defaultSource = "/gui/p5-sketches/sketch.js") {

      console.log("Loading "+projectName+" ...");

      let sketchSource = "/projects/"+projectName+"/"+sketchName+".js";

      let sketch = utils.loadScript(sketchSource, parentSection, dom);

      let scriptElement;
      sketch.then((resolved) => {
          scriptElement = resolved;
          console.log("... "+sketchSource+ " loaded");
      }).catch((rejected) => {
          console.log("... "+sketchSource + " couldn't be loaded.")
          if(defaultSource != null) {
              console.log("Loading %s instead", defaultSource);
              scriptElement = utils.loadScript(defaultSource, parentSection, dom);
              // scriptElement = this.loadSketch(defaultSource, parentSection, dom);
          }
      })
      return scriptElement;
  }

}