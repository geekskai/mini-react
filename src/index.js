const TEXT_ELEMENT = "TEXT_ELEMENT";

let rootInstance = null;

function reconcile(parentDom, instance, element) {
  if (instance == null) {
    const newInstance = instantiate(element);
    parentDom.appendChild(newInstance.dom);
    return newInstance;
  } else if (instance.element.type === element.type) {
    // update instance
    updateDomProperties(instance.dom, instance.element.props, element.props);
    instance.childInstances = reconcileChildren(instance, element);
    instance.element = element;
    return instance;
  } else {
    // replace instance
    const newInstance = instantiate(element);
    parentDom.replaceChild(newInstance.dom, instance.dom);
  }
}

function reconcileChildren(instance, element) {
  const { dom: parentDom, childInstances } = instance;
  const nextChildElements = element.props.children || [];
  const newChildInstances = [];
  const count = Math.max(childInstances.length, nextChildElements.length);

  for (let i = 0; i < count; i++) {
    const childInstance = childInstances[i];
    const childElement = nextChildElements[i];
    const newChildInstance = reconcile(parentDom, childInstance, childElement);
    newChildInstances.push(newChildInstance);
  }
  return newChildInstances.filter((childInstance) => childInstance != null);
}

function render(element, container) {
  const prevRootInstance = rootInstance;
  const nextRootInstance = reconcile(container, prevRootInstance, element);
  rootInstance = nextRootInstance;
}

function instantiate(element) {
  const { type, props } = element;

  const isTextElement = type === TEXT_ELEMENT;
  const dom = isTextElement
    ? document.createTextNode("")
    : document.createElement(type);

  updateDomProperties(dom, {}, props);

  const childElements = props.children || [];
  const childInstances = childElements.map(instantiate);
  const childDoms = childInstances.map((childInstance) => childInstance.dom);
  childDoms.forEach((childDom) => dom.appendChild(childDom));
  const instance = { dom, element, childInstances };

  return instance;
}

function updateDomProperties(dom, prevProps, nextProps) {
  const isEvent = (name) => name.startsWith("on");
  const isAttribute = (name) => !isEvent(name) && name != "children";

  // remove event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // remove attributes
  Object.keys(prevProps)
    .filter(isAttribute)
    .forEach((name) => (dom[name] = null));

  // set new attributes
  Object.keys(nextProps)
    .filter(isAttribute)
    .forEach((name) => {
      dom[name] = nextProps[name];
    });

  // add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

function createElement(type, config, ...children) {
  const props = Object.assign({}, config);
  const hasChildren = children.length > 0;
  const rawChildren = hasChildren ? [].concat(...children) : [];
  props.children = rawChildren
    .filter((child) => child != null && child !== false)
    .forEach((child) =>
      child instanceof Object ? child : createTextElement(child)
    );

  return {
    type,
    props,
  };
}

function createTextElement(text) {
  return createElement(TEXT_ELEMENT, { nodeValue: text });
}
