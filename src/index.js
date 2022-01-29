/** @jsx Gankai.createElement */
const Gankai = importFromBelow();

const stories = [
  { name: "Gankai introduction", url: "http://bit.ly/2pX7HNn" },
  { name: "Rendering DOM elements ", url: "http://bit.ly/2qCOejH" },
  { name: "Element creation and JSX", url: "http://bit.ly/2qGbw8S" },
  { name: "Instances and reconciliation", url: "http://bit.ly/2q4A746" },
  { name: "Components and state", url: "http://bit.ly/2rE16nh" },
];

class App extends Gankai.Component {
  render() {
    return (
      <div>
        <h1>Gankai Stories</h1>
        <ul>
          {this.props.stories.map((story) => {
            return <Story name={story.name} url={story.url} />;
          })}
        </ul>
      </div>
    );
  }
}

class Story extends Gankai.Component {
  constructor(props) {
    super(props);
    this.state = { likes: Math.ceil(Math.random() * 100) };
  }
  like() {
    this.setState({
      likes: this.state.likes + 1,
    });
  }
  render() {
    const { name, url } = this.props;
    const { likes } = this.state;
    const likesElement = <span />;
    return (
      <li>
        <button onClick={(e) => this.like()}>
          {likes}
          <b>❤️</b>
        </button>
        <a href={url}>{name}</a>
      </li>
    );
  }
}

Gankai.render(<App stories={stories} />, document.getElementById("root"));

function importFromBelow() {
  let rootInstance = null;
  const TEXT_ELEMENT = "TEXT_ELEMENT";

  function createElement(type, config, ...children) {
    const props = Object.assign({}, config);
    const hasChildren = children.length > 0;
    const rawChildren = hasChildren ? [].concat(...children) : [];
    props.children = rawChildren
      .filter((child) => child != null && child !== false)
      .map((child) =>
        child instanceof Object ? child : createTextElement(child)
      );

    return {
      type,
      props,
    };
  }

  class Component {
    constructor(props) {
      this.props = props;
      this.state = this.state || {};
    }
    setState(partialState) {
      this.state = Object.assign({}, this.state, partialState);
      updateInstance(this.__internalInstance);
    }
  }

  function updateInstance(internalInstance) {
    const parentDom = internalInstance.dom.parentNode;
    const element = internalInstance.element;
    reconcile(parentDom, internalInstance, element);
  }

  function createPublicInstance(element, internalInstance) {
    const { type, props } = element;
    const publicInstance = new type(props);
    publicInstance.__internalInstance = internalInstance;
    return publicInstance;
  }

  function reconcile(parentDom, instance, element) {
    if (instance == null) {
      const newInstance = instantiate(element);
      parentDom.appendChild(newInstance.dom);
      return newInstance;
    } else if (element == null) {
      // remove instance
      parentDom.removeChild(instance.dom);
      return null;
    } else if (instance.element.type !== element.type) {
      // replace instance
      const newInstance = instantiate(element);
      parentDom.replaceChild(newInstance.dom, instance.dom);
    } else if (typeof element.type === "string") {
      // update instance
      updateDomProperties(instance.dom, instance.element.props, element.props);
      instance.childInstances = reconcileChildren(instance, element);
      instance.element = element;
      return instance;
    } else {
      //Update composite instance
      instance.publicInstance.props = element.props;
      const childElement = instance.publicInstance.render();
      const oldChildInstance = instance.childInstance;
      const childInstance = reconcile(
        parentDom,
        oldChildInstance,
        childElement
      );

      instance.dom = childInstance.dom;
      instance.childInstance = childInstance;
      instance.element = element;

      return instance;
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
      const newChildInstance = reconcile(
        parentDom,
        childInstance,
        childElement
      );
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

    const isDomElement = typeof type === "string";
    // Instantiate DOM element
    if (isDomElement) {
      const isTextElement = type === TEXT_ELEMENT;
      const dom = isTextElement
        ? document.createTextNode("")
        : document.createElement(type);

      updateDomProperties(dom, [], props);

      const childElements = props.children || [];
      const childInstances = childElements.map(instantiate);
      const childDoms = childInstances.map(
        (childInstance) => childInstance.dom
      );
      childDoms.forEach((childDom) => dom.appendChild(childDom));

      const instance = { dom, element, childInstances };
      return instance;
    } else {
      // Instantiate component element
      const instance = {};
      const publicInstance = createPublicInstance(element, instance);
      const childElement = publicInstance.render();
      const childInstance = instantiate(childElement);
      const dom = childInstance.dom;

      Object.assign(instance, { dom, element, childInstance, publicInstance });

      return instance;
    }
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

  function createTextElement(text) {
    return createElement(TEXT_ELEMENT, { nodeValue: text });
  }

  return {
    createElement,
    render,
    Component,
  };
}

// =========================================
