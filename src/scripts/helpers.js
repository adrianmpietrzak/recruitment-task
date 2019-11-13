export const createElement = ({ tag, text, classes, attributes }) => {
  const element = document.createElement(tag);
  text ? (element.innerText = text) : null;
  classes ? element.classList.add(...classes) : null;
  attributes
    ? attributes.map(attribute =>
        element.setAttribute(attribute.type, attribute.value)
      )
    : null;

  return element;
};
