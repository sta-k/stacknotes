import angular from 'angular';
import template from '%/directives/panel-resizer.pug';
import { debounce } from '@/utils';

const PANEL_SIDE_RIGHT = 'right';
const PANEL_SIDE_LEFT  = 'left';

const MOUSE_EVENT_MOVE    = 'mousemove';
const MOUSE_EVENT_DOWN    = 'mousedown';
const MOUSE_EVENT_UP      = 'mouseup';

const WINDOW_EVENT_RESIZE = 'resize';

const PANEL_CSS_CLASS_HOVERABLE       = 'hoverable';
const PANEL_CSS_CLASS_ALWAYS_VISIBLE  = 'always-visible';
const PANEL_CSS_CLASS_DRAGGING        = 'dragging';
const PANEL_CSS_CLASS_NO_SELECTION    = 'no-selection';
const PANEL_CSS_CLASS_COLLAPSED       = 'collapsed';
const PANEL_CSS_CLASS_ANIMATE_OPACITY = 'animate-opacity';

class PanelResizerCtrl {
  /* @ngInject */
  constructor(
    $compile,
    $element,
    $scope,
    $timeout,
  ) {
    this.$compile = $compile;
    this.$element = $element;
    this.$scope = $scope;
    this.$timeout = $timeout;
  }

  $onInit() {
    this.configureControl();
    this.configureDefaults();
    this.addDoubleClickHandler();
    this.reloadDefaultValues();
    this.addMouseDownListener();
    this.addMouseMoveListener();
    this.addMouseUpListener();
  }

  configureControl() {
    this.control.setWidth = (value) => {
      this.setWidth(value, true);
    };

    this.control.setLeft = (value) => {
      this.setLeft(value);
    };

    this.control.flash = () => {
      this.flash();
    };

    this.control.isCollapsed = () => {
      return this.isCollapsed();
    };
  }

  configureDefaults() {
    this.panel = document.getElementById(this.panelId);
    if (!this.panel) {
      console.error('Panel not found for', this.panelId);
    }

    this.resizerColumn = this.$element[0];
    this.currentMinWidth = this.minWidth || this.resizerColumn.offsetWidth;
    this.pressed = false;
    this.startWidth = this.panel.scrollWidth;
    this.lastDownX = 0;
    this.collapsed = false;
    this.lastWidth = this.startWidth;
    this.startLeft = this.panel.offsetLeft;
    this.lastLeft = this.startLeft;
    this.appFrame = null;
    this.widthBeforeLastDblClick = 0;

    if (this.property === PANEL_SIDE_RIGHT) {
      this.configureRightPanel();
    }
    if (this.alwaysVisible) {
      this.resizerColumn.classList.add(PANEL_CSS_CLASS_ALWAYS_VISIBLE);
    }
    if (this.hoverable) {
      this.resizerColumn.classList.add(PANEL_CSS_CLASS_HOVERABLE);
    }
  }

  configureRightPanel() {
    const handleResize = debounce(event => {
      this.reloadDefaultValues();
      this.handleWidthEvent();
      this.$timeout(() => {
        this.finishSettingWidth();
      });
    }, 250);
    window.addEventListener(WINDOW_EVENT_RESIZE, handleResize);
    this.$scope.$on('$destroy', () => {
      window.removeEventListener(WINDOW_EVENT_RESIZE, handleResize);
    });
  }

  getParentRect() {
    return this.panel.parentNode.getBoundingClientRect();
  }

  reloadDefaultValues() {
    this.startWidth = this.isAtMaxWidth()
      ? this.getParentRect().width
      : this.panel.scrollWidth;
    this.lastWidth = this.startWidth;
    this.appFrame = document.getElementById('app').getBoundingClientRect();
  }

  addDoubleClickHandler() {
    this.resizerColumn.ondblclick = () => {
      this.$timeout(() => {
        const preClickCollapseState = this.isCollapsed();
        if (preClickCollapseState) {
          this.setWidth(this.widthBeforeLastDblClick || this.defaultWidth);
        } else {
          this.widthBeforeLastDblClick = this.lastWidth;
          this.setWidth(this.currentMinWidth);
        }

        this.finishSettingWidth();

        const newCollapseState = !preClickCollapseState;
        this.onResizeFinish()(
          this.lastWidth,
          this.lastLeft,
          this.isAtMaxWidth(),
          newCollapseState
        );
      });
    };
  }

  addMouseDownListener() {
    this.resizerColumn.addEventListener(MOUSE_EVENT_DOWN, (event) => {
      this.addInvisibleOverlay();
      this.pressed = true;
      this.lastDownX = event.clientX;
      this.startWidth = this.panel.scrollWidth;
      this.startLeft = this.panel.offsetLeft;
      this.panel.classList.add(PANEL_CSS_CLASS_NO_SELECTION);
      if (this.hoverable) {
        this.resizerColumn.classList.add(PANEL_CSS_CLASS_DRAGGING);
      }
    });
  }

  addMouseMoveListener() {
    document.addEventListener(MOUSE_EVENT_MOVE, (event) => {
      if (!this.pressed) {
        return;
      }
      event.preventDefault();
      if (this.property && this.property === PANEL_SIDE_LEFT) {
        this.handleLeftEvent(event);
      } else {
        this.handleWidthEvent(event);
      }
    });
  }

  handleWidthEvent(event) {
    let x;
    if (event) {
      x = event.clientX;
    } else {
      /** Coming from resize event */
      x = 0;
      this.lastDownX = 0;
    }

    const deltaX = x - this.lastDownX;
    const newWidth = this.startWidth + deltaX;
    this.setWidth(newWidth, false);
    if (this.onResize()) {
      this.onResize()(this.lastWidth, this.panel);
    }
  }

  handleLeftEvent(event) {
    const panelRect = this.panel.getBoundingClientRect();
    const x = event.clientX || panelRect.x;
    let deltaX = x - this.lastDownX;
    let newLeft = this.startLeft + deltaX;
    if (newLeft < 0) {
      newLeft = 0;
      deltaX = -this.startLeft;
    }
    const parentRect = this.getParentRect();
    let newWidth = this.startWidth - deltaX;
    if (newWidth < this.currentMinWidth) {
      newWidth = this.currentMinWidth;
    }
    if (newWidth > parentRect.width) {
      newWidth = parentRect.width;
    }
    if (newLeft + newWidth > parentRect.width) {
      newLeft = parentRect.width - newWidth;
    }
    this.setLeft(newLeft, false);
    this.setWidth(newWidth, false);
  }

  addMouseUpListener() {
    document.addEventListener(MOUSE_EVENT_UP, event => {
      this.removeInvisibleOverlay();
      if (this.pressed) {
        this.pressed = false;
        this.resizerColumn.classList.remove(PANEL_CSS_CLASS_DRAGGING);
        this.panel.classList.remove(PANEL_CSS_CLASS_NO_SELECTION);
        const isMaxWidth = this.isAtMaxWidth();
        if (this.onResizeFinish) {
          this.onResizeFinish()(
            this.lastWidth,
            this.lastLeft,
            isMaxWidth,
            this.isCollapsed()
          );
        }
        this.finishSettingWidth();
      }
    });
  }

  isAtMaxWidth() {
    return (
      Math.round(this.lastWidth + this.lastLeft) === 
      Math.round(this.getParentRect().width)
    );
  }

  isCollapsed() {
    return this.lastWidth <= this.currentMinWidth;
  }

  setWidth(width, finish) {
    if (width < this.currentMinWidth) {
      width = this.currentMinWidth;
    }
    const parentRect = this.getParentRect();
    if (width > parentRect.width) {
      width = parentRect.width;
    }

    const maxWidth = this.appFrame.width - this.panel.getBoundingClientRect().x;
    if (width > maxWidth) {
      width = maxWidth;
    }
    if (Math.round(width + this.lastLeft) === Math.round(parentRect.width)) {
      this.panel.style.width = `calc(100% - ${this.lastLeft}px)`;
      this.panel.style.flexBasis = `calc(100% - ${this.lastLeft}px)`;
    } else {
      this.panel.style.flexBasis = width + 'px';
      this.panel.style.width = width + 'px';
    }
    this.lastWidth = width;
    if (finish) {
      this.finishSettingWidth();
    }
  }

  setLeft(left) {
    this.panel.style.left = left + 'px';
    this.lastLeft = left;
  }

  finishSettingWidth() {
    if (!this.collapsable) {
      return;
    }

    this.collapsed = this.isCollapsed();
    if (this.collapsed) {
      this.resizerColumn.classList.add(PANEL_CSS_CLASS_COLLAPSED);
    } else {
      this.resizerColumn.classList.remove(PANEL_CSS_CLASS_COLLAPSED);
    }
  }

  /**
   * If an iframe is displayed adjacent to our panel, and the mouse exits over the iframe,
   * document[onmouseup] is not triggered because the document is no longer the same over 
   * the iframe. We add an invisible overlay while resizing so that the mouse context 
   * remains in our main document.
   */
  addInvisibleOverlay() {
    if (this.overlay) {
      return;
    }
    this.overlay = this.$compile(`<div id='resizer-overlay'></div>`)(this.$scope);
    angular.element(document.body).prepend(this.overlay);
  }

  removeInvisibleOverlay() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  flash() {
    const FLASH_DURATION = 3000;
    this.resizerColumn.classList.add(PANEL_CSS_CLASS_ANIMATE_OPACITY);
    this.$timeout(() => {
      this.resizerColumn.classList.remove(PANEL_CSS_CLASS_ANIMATE_OPACITY);
    }, FLASH_DURATION);
  }
}

export class PanelResizer {
  constructor() {
    this.restrict = 'E';
    this.template = template;
    this.controller = PanelResizerCtrl;
    this.controllerAs = 'ctrl';
    this.bindToController = true;
    this.scope = {
      alwaysVisible: '=',
      collapsable: '=',
      control: '=',
      defaultWidth: '=',
      hoverable: '=',
      index: '=',
      minWidth: '=',
      onResize: '&',
      onResizeFinish: '&',
      panelId: '=',
      property: '='
    };
  }
}
